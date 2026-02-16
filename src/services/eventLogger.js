/**
 * Event Logger Service
 * 
 * Records application events for debugging and future analytics.
 * Currently outputs to console; designed for future backend integration.
 */

const EVENT_LOG = [];
const MAX_LOG_SIZE = 200;

/**
 * Log an application event.
 * @param {string} name - Event name (e.g. 'image_selected', 'pii_detection_completed')
 * @param {object} [payload] - Optional event data (sensitive data should be redacted)
 */
export function logEvent(name, payload = {}) {
    const entry = {
        event: name,
        timestamp: new Date().toISOString(),
        ...payload,
    };

    // Console output (development)
    console.log(`[Event] ${name}`, payload);

    // In-memory buffer
    EVENT_LOG.push(entry);
    if (EVENT_LOG.length > MAX_LOG_SIZE) {
        EVENT_LOG.shift();
    }
}

/**
 * Get all logged events (for debugging).
 * @returns {Array} Event log entries
 */
export function getEventLog() {
    return [...EVENT_LOG];
}

/**
 * Clear the event log.
 */
export function clearEventLog() {
    EVENT_LOG.length = 0;
}

/**
 * Future: Send events to backend analytics endpoint.
 * @param {string} endpoint - Backend URL
 */
export async function flushEvents(endpoint) {
    if (EVENT_LOG.length === 0) return;

    try {
        // TODO: Implement when backend is ready
        // await fetch(endpoint, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ events: EVENT_LOG }),
        // });
        // clearEventLog();
        console.log(`[EventLogger] ${EVENT_LOG.length} events ready to flush`);
    } catch (error) {
        console.error('[EventLogger] Flush failed:', error);
    }
}
