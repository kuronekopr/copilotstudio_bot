-- Azure SQL DDL for Data Design (Event Sourcing, Append-only, PII-safe)
-- Principle: All core tables use INSERT-only, no UPDATE/DELETE on business data
-- PII: Only masked text and metadata stored, no raw PII or raw images

-- Table 1: inquiry_event (Core event table - Append-only)
-- This is the primary event source for all inquiry data
CREATE TABLE dbo.inquiry_event (
    event_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    session_id NVARCHAR(256) NOT NULL,
    cluster_id NVARCHAR(64) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL,
    user_text_masked NVARCHAR(MAX) NOT NULL,  -- PII masked version only
    user_text_hash NVARCHAR(64) NULL,          -- SHA-256 for deduplication, no content
    image_count INT NOT NULL DEFAULT 0,
    processing_time_ms INT NOT NULL,
    rag_hit NVARCHAR(MAX) NULL,                -- JSON: rag search results
    is_escalated BIT NOT NULL DEFAULT 0,
    threshold_version NVARCHAR(32) NOT NULL,   -- Version of PII detection threshold
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_inquiry_event PRIMARY KEY (event_id),
    CONSTRAINT CK_inquiry_event_processing_time CHECK (processing_time_ms >= 0)
);

-- Create indexes for inquiry_event
CREATE NONCLUSTERED INDEX IX_inquiry_event_created_at 
    ON dbo.inquiry_event (created_at DESC);

CREATE NONCLUSTERED INDEX IX_inquiry_event_cluster_created 
    ON dbo.inquiry_event (cluster_id, created_at DESC);

CREATE NONCLUSTERED INDEX IX_inquiry_event_escalated 
    ON dbo.inquiry_event (is_escalated, created_at DESC);

CREATE NONCLUSTERED INDEX IX_inquiry_event_session 
    ON dbo.inquiry_event (session_id, created_at DESC);

-- Table 2: inquiry_stage_event (Stage-level events for traceability - Append-only)
-- Captures input, image, analysis, RAG, answer, escalation as separate events
CREATE TABLE dbo.inquiry_stage_event (
    stage_event_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    stage_type NVARCHAR(32) NOT NULL,          -- 'INPUT', 'IMAGE', 'ANALYSIS', 'RAG', 'ANSWER', 'ESCALATION'
    stage_timestamp DATETIMEOFFSET NOT NULL,
    stage_data NVARCHAR(MAX) NOT NULL,         -- JSON payload (PII-safe)
    processing_time_ms INT NULL,
    error_message NVARCHAR(MAX) NULL,
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_inquiry_stage_event PRIMARY KEY (stage_event_id),
    CONSTRAINT FK_inquiry_stage_event_inquiry FOREIGN KEY (event_id) REFERENCES dbo.inquiry_event(event_id)
);

CREATE NONCLUSTERED INDEX IX_inquiry_stage_event_event_id 
    ON dbo.inquiry_stage_event (event_id, stage_timestamp DESC);

CREATE NONCLUSTERED INDEX IX_inquiry_stage_event_stage_type 
    ON dbo.inquiry_stage_event (stage_type, stage_timestamp DESC);

-- Table 3: image_asset (Image metadata - Append-only)
-- Stores metadata about images; actual images stored in Blob (masked only)
CREATE TABLE dbo.image_asset (
    image_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    image_index INT NOT NULL,
    masked_blob_uri NVARCHAR(500) NULL,        -- NULL for 'no image storage' policy
    image_hash NVARCHAR(64) NOT NULL,          -- SHA-256 of original (for dedup)
    mask_version NVARCHAR(32) NOT NULL,        -- PII mask version
    pii_auto_detect_used BIT NOT NULL,         -- Was auto-detection used?
    strong_pii_count INT NOT NULL DEFAULT 0,   -- Count of strong PII blocks
    weak_pii_count INT NOT NULL DEFAULT 0,     -- Count of weak PII blocks
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_image_asset PRIMARY KEY (image_id),
    CONSTRAINT FK_image_asset_inquiry FOREIGN KEY (event_id) REFERENCES dbo.inquiry_event(event_id)
);

CREATE NONCLUSTERED INDEX IX_image_asset_event_id 
    ON dbo.image_asset (event_id);

CREATE NONCLUSTERED INDEX IX_image_asset_created 
    ON dbo.image_asset (created_timestamp DESC);

-- Table 4: pii_mask_session (PII masking history - Append-only)
-- Tracks which mask version was applied, threshold config, etc.
CREATE TABLE dbo.pii_mask_session (
    mask_session_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    mask_version NVARCHAR(32) NOT NULL,
    threshold_config NVARCHAR(MAX) NOT NULL,   -- JSON: email/phone/postal/address/id thresholds
    strong_category_count NVARCHAR(MAX) NOT NULL,  -- JSON: strong_count_by_category
    weak_category_count NVARCHAR(MAX) NOT NULL,    -- JSON: weak_count_by_category
    auto_mask_applied BIT NOT NULL,
    manual_additional_mask BIT NOT NULL,       -- Indicates manual correction
    removed_auto_mask BIT NOT NULL,            -- Indicates false positive removal
    score_histogram NVARCHAR(MAX) NULL,        -- JSON: 10-bin histogram
    masked_timestamp DATETIMEOFFSET NOT NULL,
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_pii_mask_session PRIMARY KEY (mask_session_id),
    CONSTRAINT FK_pii_mask_session_inquiry FOREIGN KEY (event_id) REFERENCES dbo.inquiry_event(event_id)
);

CREATE NONCLUSTERED INDEX IX_pii_mask_session_event_id 
    ON dbo.pii_mask_session (event_id);

CREATE NONCLUSTERED INDEX IX_pii_mask_session_version 
    ON dbo.pii_mask_session (mask_version, created_timestamp DESC);

-- Table 5: rag_search_log (RAG search results - Append-only)
CREATE TABLE dbo.rag_search_log (
    rag_log_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    query_hash NVARCHAR(64) NOT NULL,          -- SHA-256 of query (no raw text)
    search_timestamp DATETIMEOFFSET NOT NULL,
    hit_count INT NOT NULL,
    top_hit_relevance_score FLOAT NULL,
    search_time_ms INT NOT NULL,
    embedding_model NVARCHAR(64) NOT NULL,
    knowledge_base_version NVARCHAR(32) NOT NULL,
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_rag_search_log PRIMARY KEY (rag_log_id),
    CONSTRAINT FK_rag_search_log_inquiry FOREIGN KEY (event_id) REFERENCES dbo.inquiry_event(event_id)
);

CREATE NONCLUSTERED INDEX IX_rag_search_log_event_id 
    ON dbo.rag_search_log (event_id);

CREATE NONCLUSTERED INDEX IX_rag_search_log_created 
    ON dbo.rag_search_log (created_timestamp DESC);

-- Table 6: answer_log (Generated answers - Append-only)
CREATE TABLE dbo.answer_log (
    answer_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    answer_text_masked NVARCHAR(MAX) NOT NULL, -- PII masked version
    confidence_score FLOAT NOT NULL,
    answer_category NVARCHAR(64) NOT NULL,
    is_unknown_flag BIT NOT NULL,              -- Was answer UNKNOWN?
    generated_timestamp DATETIMEOFFSET NOT NULL,
    llm_model NVARCHAR(64) NOT NULL,
    generation_time_ms INT NOT NULL,
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_answer_log PRIMARY KEY (answer_id),
    CONSTRAINT FK_answer_log_inquiry FOREIGN KEY (event_id) REFERENCES dbo.inquiry_event(event_id),
    CONSTRAINT CK_answer_log_confidence CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

CREATE NONCLUSTERED INDEX IX_answer_log_event_id 
    ON dbo.answer_log (event_id);

CREATE NONCLUSTERED INDEX IX_answer_log_is_unknown 
    ON dbo.answer_log (is_unknown_flag, created_timestamp DESC);

CREATE NONCLUSTERED INDEX IX_answer_log_created 
    ON dbo.answer_log (created_timestamp DESC);

-- Table 7: threshold_history (Threshold optimization history - Append-only)
-- Stores historical threshold versions and optimization metrics
CREATE TABLE dbo.threshold_history (
    threshold_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    threshold_version NVARCHAR(32) NOT NULL UNIQUE,
    parent_version NVARCHAR(32) NULL,          -- Version this evolved from
    email_strong_threshold FLOAT NOT NULL,
    email_weak_threshold FLOAT NOT NULL,
    phone_strong_threshold FLOAT NOT NULL,
    phone_weak_threshold FLOAT NOT NULL,
    postal_strong_threshold FLOAT NOT NULL,
    postal_weak_threshold FLOAT NOT NULL,
    address_strong_threshold FLOAT NOT NULL,
    address_weak_threshold FLOAT NOT NULL,
    id_strong_threshold FLOAT NOT NULL,
    id_weak_threshold FLOAT NOT NULL,
    loss_score FLOAT NULL,                     -- Optimization loss value
    manual_rate FLOAT NULL,                    -- Manual correction rate
    removed_rate FLOAT NULL,                   -- Over-detection rate
    auto_applied_rate FLOAT NULL,              -- Auto-detection success rate
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 0,
    created_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_threshold_history PRIMARY KEY (threshold_id)
);

CREATE NONCLUSTERED INDEX IX_threshold_history_version 
    ON dbo.threshold_history (threshold_version DESC);

CREATE NONCLUSTERED INDEX IX_threshold_history_active 
    ON dbo.threshold_history (is_active, created_timestamp DESC);

-- Table 8: event_summary (Materialized view table for daily aggregation)
-- Used for KPI and reporting (optional, can be populated via scheduled job)
CREATE TABLE dbo.event_summary (
    summary_date DATE NOT NULL PRIMARY KEY,
    total_inquiries INT NOT NULL DEFAULT 0,
    total_with_images INT NOT NULL DEFAULT 0,
    avg_processing_time_ms FLOAT NOT NULL DEFAULT 0,
    rag_hit_rate FLOAT NOT NULL DEFAULT 0,
    unknown_count INT NOT NULL DEFAULT 0,
    escalated_count INT NOT NULL DEFAULT 0,
    avg_confidence_score FLOAT NOT NULL DEFAULT 0,
    updated_timestamp DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_event_summary PRIMARY KEY (summary_date)
);

-- Maintenance: Stored procedure for safe deletion (archive first, then delete)
-- Usage: EXEC sp_archive_and_delete_old_events @retention_days = 365
CREATE PROCEDURE sp_archive_and_delete_old_events
    @retention_days INT = 365
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @cutoff_date DATETIMEOFFSET = DATEADD(DAY, -@retention_days, GETUTCDATE());
    
    -- Option 1: Move to archive table (before deletion)
    -- INSERT INTO dbo.inquiry_event_archive SELECT * FROM dbo.inquiry_event WHERE created_at < @cutoff_date;
    
    -- For now, we log the deletion intent (audit trail)
    -- Actual deletion should be done carefully with proper backup/archive strategy
    
    SELECT COUNT(*) AS events_to_delete
    FROM dbo.inquiry_event
    WHERE created_at < @cutoff_date;
END;

-- NOTE: Append-only enforcement
-- In production, consider:
-- 1. Remove UPDATE/DELETE permissions from application roles on core tables
-- 2. Grant only INSERT to application
-- 3. Maintain a separate audit role with minimal SELECT access
-- 4. Use change data capture (CDC) or temporal tables for audit trail if needed
