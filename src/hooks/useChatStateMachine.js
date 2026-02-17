import { useReducer, useCallback } from 'react';
import { logEvent } from '../services/eventLogger';

/**
 * Chat State Machine
 * 
 * States:
 *   IDLE → IMAGE_SELECTED → PREPROCESSING → PII_DETECTING → PII_REVIEW
 *   → SENDING → WAITING_RESPONSE → ANSWER_SHOWN → END
 * 
 * Also tracks: ERROR state (can return to previous or IDLE)
 */

// ---------- State Definitions ----------
export const STATES = {
    IDLE: 'IDLE',
    IMAGE_SELECTED: 'IMAGE_SELECTED',
    PREPROCESSING: 'PREPROCESSING',
    PII_DETECTING: 'PII_DETECTING',
    PII_REVIEW: 'PII_REVIEW',
    SENDING: 'SENDING',
    WAITING_RESPONSE: 'WAITING_RESPONSE',
    ANSWER_SHOWN: 'ANSWER_SHOWN',
    END: 'END',
    ERROR: 'ERROR',
};

// ---------- Action Types ----------
export const ACTIONS = {
    SELECT_IMAGE: 'SELECT_IMAGE',
    REMOVE_ALL_IMAGES: 'REMOVE_ALL_IMAGES',
    START_PREPROCESSING: 'START_PREPROCESSING',
    PREPROCESSING_DONE: 'PREPROCESSING_DONE',
    PREPROCESSING_ERROR: 'PREPROCESSING_ERROR',
    START_PII_DETECTION: 'START_PII_DETECTION',
    PII_DETECTION_DONE: 'PII_DETECTION_DONE',
    PII_DETECTION_ERROR: 'PII_DETECTION_ERROR',
    CONFIRM_PII_REVIEW: 'CONFIRM_PII_REVIEW',
    CANCEL_PII_REVIEW: 'CANCEL_PII_REVIEW',
    SKIP_PII_REVIEW: 'SKIP_PII_REVIEW',
    START_SENDING: 'START_SENDING',
    SEND_SUCCESS: 'SEND_SUCCESS',
    SEND_ERROR: 'SEND_ERROR',
    RESPONSE_RECEIVED: 'RESPONSE_RECEIVED',
    RESPONSE_TIMEOUT: 'RESPONSE_TIMEOUT',
    END_SESSION: 'END_SESSION',
    RESET: 'RESET',
    RETRY: 'RETRY',
    SEND_TEXT_ONLY: 'SEND_TEXT_ONLY',
};

// ---------- Answer Types ----------
export const ANSWER_TYPES = {
    AUTO_RESOLVE: 'AUTO_RESOLVE',
    ASK_CLARIFICATION: 'ASK_CLARIFICATION',
    ESCALATE: 'ESCALATE',
};

// ---------- Valid Transitions ----------
const TRANSITIONS = {
    [STATES.IDLE]: [ACTIONS.SELECT_IMAGE, ACTIONS.SEND_TEXT_ONLY],
    [STATES.IMAGE_SELECTED]: [ACTIONS.REMOVE_ALL_IMAGES, ACTIONS.START_PREPROCESSING],
    [STATES.PREPROCESSING]: [ACTIONS.PREPROCESSING_DONE, ACTIONS.PREPROCESSING_ERROR],
    [STATES.PII_DETECTING]: [ACTIONS.PII_DETECTION_DONE, ACTIONS.PII_DETECTION_ERROR],
    [STATES.PII_REVIEW]: [ACTIONS.CONFIRM_PII_REVIEW, ACTIONS.CANCEL_PII_REVIEW, ACTIONS.SKIP_PII_REVIEW],
    [STATES.SENDING]: [ACTIONS.SEND_SUCCESS, ACTIONS.SEND_ERROR],
    [STATES.WAITING_RESPONSE]: [ACTIONS.RESPONSE_RECEIVED, ACTIONS.RESPONSE_TIMEOUT],
    [STATES.ANSWER_SHOWN]: [ACTIONS.END_SESSION, ACTIONS.START_SENDING],
    [STATES.END]: [ACTIONS.RESET],
    [STATES.ERROR]: [ACTIONS.RETRY, ACTIONS.RESET],
};

// ---------- Status Messages ----------
export const STATE_MESSAGES = {
    [STATES.IDLE]: null,
    [STATES.IMAGE_SELECTED]: null,
    [STATES.PREPROCESSING]: '画像を処理中...',
    [STATES.PII_DETECTING]: '内容を分析中...',
    [STATES.PII_REVIEW]: null,
    [STATES.SENDING]: '送信中...',
    [STATES.WAITING_RESPONSE]: '回答を作成中...',
    [STATES.ANSWER_SHOWN]: null,
    [STATES.END]: null,
    [STATES.ERROR]: null,
};

// ---------- Initial State ----------
const initialState = {
    currentState: STATES.IDLE,
    previousState: null,
    images: [],              // Selected image files
    processedImages: [],     // After preprocessing
    piiDetections: [],       // PII detection results
    maskedImages: [],        // After PII masking
    answerType: null,        // AUTO_RESOLVE | ASK_CLARIFICATION | ESCALATE
    answerData: null,        // Bot response data
    error: null,             // Error object
    retryCount: 0,
    sessionId: null,
    pendingText: '',         // Text message pending send
    processingStats: {
        preprocessingTimeMs: 0,
        piiDetectionTimeMs: 0,
        totalClientTimeMs: 0
    },
    piiStats: null
};

// ---------- Reducer ----------
function chatReducer(state, action) {
    const { type, payload } = action;

    // Validate transition
    const validActions = TRANSITIONS[state.currentState];
    const isReset = type === ACTIONS.RESET;
    if (!isReset && validActions && !validActions.includes(type)) {
        console.warn(`[StateMachine] Invalid transition: ${state.currentState} + ${type}`);
        return state;
    }

    switch (type) {
        case ACTIONS.SELECT_IMAGE:
            logEvent('image_selected', { count: payload?.images?.length || 1 });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.IMAGE_SELECTED,
                images: payload?.images || state.images,
                pendingText: payload?.text || state.pendingText,
            };

        case ACTIONS.REMOVE_ALL_IMAGES:
            logEvent('images_cleared');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.IDLE,
                images: [],
                processedImages: [],
            };

        case ACTIONS.START_PREPROCESSING:
            logEvent('preprocessing_started');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.PREPROCESSING,
            };

        case ACTIONS.PREPROCESSING_DONE:
            logEvent('preprocessing_completed', {
                processingTimeMs: payload?.processingTimeMs,
            });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.PII_DETECTING,
                processedImages: payload?.processedImages || state.images,
                processingStats: {
                    ...state.processingStats,
                    preprocessingTimeMs: payload?.processingTimeMs || 0
                }
            };

        case ACTIONS.PREPROCESSING_ERROR:
            logEvent('preprocessing_failed', { error: payload?.error });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.ERROR,
                error: { message: '画像処理中にエラーが発生しました', detail: payload?.error },
            };

        case ACTIONS.START_PII_DETECTION:
            logEvent('pii_detection_started');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.PII_DETECTING,
            };

        case ACTIONS.PII_DETECTION_DONE:
            logEvent('pii_detection_completed', {
                detectionCount: payload?.detections?.length || 0,
            });
            if (payload?.detections?.length > 0) {
                return {
                    ...state,
                    previousState: state.currentState,
                    currentState: STATES.PII_REVIEW,
                    piiDetections: payload.detections,
                    piiStats: payload.piiStats,
                    processingStats: {
                        ...state.processingStats,
                        piiDetectionTimeMs: payload?.processingTimeMs || 0
                    }
                };
            }
            // No PII → skip review, go to SENDING
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.SENDING,
                piiDetections: [],
                piiStats: payload.piiStats,
                processingStats: {
                    ...state.processingStats,
                    piiDetectionTimeMs: payload?.processingTimeMs || 0
                }
            };

        case ACTIONS.PII_DETECTION_ERROR:
            logEvent('pii_detection_failed', { error: payload?.error });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.ERROR,
                error: { message: '内容の分析に失敗しました', detail: payload?.error },
            };

        case ACTIONS.CONFIRM_PII_REVIEW:
            logEvent('pii_review_submitted');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.SENDING,
                maskedImages: payload?.maskedImages || state.maskedImages,
            };

        case ACTIONS.CANCEL_PII_REVIEW:
            logEvent('pii_review_cancelled');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.IDLE,
                images: [],
                processedImages: [],
                piiDetections: [],
            };

        case ACTIONS.SKIP_PII_REVIEW:
            logEvent('pii_review_skipped');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.SENDING,
            };

        case ACTIONS.SEND_TEXT_ONLY:
            logEvent('text_message_sending');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.SENDING,
                pendingText: payload?.text || state.pendingText,
            };

        case ACTIONS.START_SENDING:
            logEvent('message_sending');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.SENDING,
            };

        case ACTIONS.SEND_SUCCESS:
            logEvent('masked_message_sent');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.WAITING_RESPONSE,
                pendingText: '',
                images: [],
                processedImages: [],
                piiDetections: [],
                maskedImages: [],
            };

        case ACTIONS.SEND_ERROR:
            logEvent('send_failed', { error: payload?.error });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.ERROR,
                error: { message: '送信に失敗しました', detail: payload?.error },
                retryCount: state.retryCount + 1,
            };

        case ACTIONS.RESPONSE_RECEIVED:
            logEvent('response_received', { answerType: payload?.answerType });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.ANSWER_SHOWN,
                answerType: payload?.answerType || ANSWER_TYPES.AUTO_RESOLVE,
                answerData: payload?.data,
            };

        case ACTIONS.RESPONSE_TIMEOUT:
            logEvent('response_timeout');
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.ERROR,
                error: { message: 'サーバーからの応答がありません' },
            };

        case ACTIONS.END_SESSION:
            logEvent('session_ended', { reason: payload?.reason });
            return {
                ...state,
                previousState: state.currentState,
                currentState: STATES.END,
            };

        case ACTIONS.RETRY:
            logEvent('retry_attempted', { retryCount: state.retryCount });
            if (state.retryCount >= 3) {
                // Auto-escalate after 3 retries
                return {
                    ...state,
                    previousState: state.currentState,
                    currentState: STATES.ANSWER_SHOWN,
                    answerType: ANSWER_TYPES.ESCALATE,
                    answerData: { reason: 'max_retries_exceeded' },
                };
            }
            return {
                ...state,
                previousState: state.currentState,
                currentState: state.previousState || STATES.IDLE,
                error: null,
            };

        case ACTIONS.RESET:
            logEvent('session_reset');
            return { ...initialState };

        default:
            console.warn(`[StateMachine] Unknown action: ${type}`);
            return state;
    }
}

// ---------- Hook ----------
export function useChatStateMachine() {
    const [state, dispatch] = useReducer(chatReducer, initialState);

    const isState = useCallback(
        (...states) => states.includes(state.currentState),
        [state.currentState]
    );

    const statusMessage = STATE_MESSAGES[state.currentState];
    const isProcessing = isState(
        STATES.PREPROCESSING,
        STATES.PII_DETECTING,
        STATES.SENDING,
        STATES.WAITING_RESPONSE
    );

    return {
        state,
        dispatch,
        isState,
        statusMessage,
        isProcessing,
        STATES,
        ACTIONS,
        ANSWER_TYPES,
    };
}
