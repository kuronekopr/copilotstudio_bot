import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useChatStateMachine, STATES, ACTIONS, ANSWER_TYPES } from './useChatStateMachine';
import * as Logger from '../services/eventLogger';

// Mock Logger
vi.mock('../services/eventLogger', () => ({
    logEvent: vi.fn(),
}));

describe('useChatStateMachine', () => {
    it('should initialize with IDLE state', () => {
        const { result } = renderHook(() => useChatStateMachine());
        expect(result.current.state.currentState).toBe(STATES.IDLE);
        expect(result.current.statusMessage).toBeNull();
    });

    it('should transition to IMAGE_SELECTED when an image is selected', () => {
        const { result } = renderHook(() => useChatStateMachine());
        const mockImages = [new File([''], 'test.png', { type: 'image/png' })];

        act(() => {
            result.current.dispatch({ type: ACTIONS.SELECT_IMAGE, payload: { images: mockImages } });
        });

        expect(result.current.state.currentState).toBe(STATES.IMAGE_SELECTED);
        expect(result.current.state.images).toEqual(mockImages);
        expect(Logger.logEvent).toHaveBeenCalledWith('image_selected', { count: 1 });
    });

    it('should transition through PII flow', () => {
        const { result } = renderHook(() => useChatStateMachine());

        // 1. Select Image
        act(() => {
            result.current.dispatch({ type: ACTIONS.SELECT_IMAGE, payload: { images: [] } });
        });
        expect(result.current.state.currentState).toBe(STATES.IMAGE_SELECTED);

        // 2. Start Preprocessing
        act(() => {
            result.current.dispatch({ type: ACTIONS.START_PREPROCESSING });
        });
        expect(result.current.state.currentState).toBe(STATES.PREPROCESSING);
        expect(result.current.statusMessage).toBe('画像を処理中...');

        // 3. Preprocessing Done
        act(() => {
            result.current.dispatch({ type: ACTIONS.PREPROCESSING_DONE });
        });
        expect(result.current.state.currentState).toBe(STATES.PII_DETECTING);
        expect(result.current.statusMessage).toBe('内容を分析中...');

        // 4. PII Detected -> Review
        act(() => {
            result.current.dispatch({
                type: ACTIONS.PII_DETECTION_DONE,
                payload: { detections: [{ type: 'EMAIL', text: 'test@example.com' }] }
            });
        });
        expect(result.current.state.currentState).toBe(STATES.PII_REVIEW);
        expect(result.current.state.piiDetections).toHaveLength(1);

        // 5. Confirm Review -> Sending
        act(() => {
            result.current.dispatch({ type: ACTIONS.CONFIRM_PII_REVIEW });
        });
        expect(result.current.state.currentState).toBe(STATES.SENDING);
    });

    it('should handle error states and retries', () => {
        const { result } = renderHook(() => useChatStateMachine());

        // Start text sending (IDLE -> SENDING)
        act(() => {
            result.current.dispatch({ type: ACTIONS.SEND_TEXT_ONLY });
        });
        expect(result.current.state.currentState).toBe(STATES.SENDING);

        // Simulate error
        act(() => {
            result.current.dispatch({ type: ACTIONS.SEND_ERROR, payload: { error: 'Network Error' } });
        });
        expect(result.current.state.currentState).toBe(STATES.ERROR);
        expect(result.current.state.retryCount).toBe(1);

        // Retry 1
        act(() => {
            result.current.dispatch({ type: ACTIONS.RETRY });
        });
        expect(result.current.state.currentState).toBe(STATES.SENDING);

        // Error again (2)
        act(() => {
            result.current.dispatch({ type: ACTIONS.SEND_ERROR });
        });
        // Retry 2
        act(() => {
            result.current.dispatch({ type: ACTIONS.RETRY });
        });
        // Error again (3)
        act(() => {
            result.current.dispatch({ type: ACTIONS.SEND_ERROR });
        });
        // Retry 3 -> Should auto-escalate
        act(() => {
            result.current.dispatch({ type: ACTIONS.RETRY });
        });

        expect(result.current.state.currentState).toBe(STATES.ANSWER_SHOWN);
        expect(result.current.state.answerType).toBe(ANSWER_TYPES.ESCALATE);
    });

    it('should ignore invalid transitions', () => {
        const { result } = renderHook(() => useChatStateMachine());
        // IDLE -> PII_REVIEW is invalid
        act(() => {
            result.current.dispatch({ type: ACTIONS.CONFIRM_PII_REVIEW });
        });
        // Sould remain IDLE
        expect(result.current.state.currentState).toBe(STATES.IDLE);
    });
});
