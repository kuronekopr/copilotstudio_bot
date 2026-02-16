import React from 'react';

/**
 * Status Indicator - shows processing state with spinner and message.
 * Displays during PREPROCESSING, PII_DETECTING, SENDING, WAITING_RESPONSE states.
 */
const StatusIndicator = ({ message, isVisible }) => {
    if (!isVisible || !message) return null;

    return (
        <div className="status-indicator">
            <div className="status-spinner" />
            <span className="status-text">{message}</span>
        </div>
    );
};

export default StatusIndicator;
