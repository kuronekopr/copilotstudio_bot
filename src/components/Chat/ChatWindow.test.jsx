import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWindow from './ChatWindow';
import { directLineService } from '../../services/directLine';
import { preprocessImage } from '../../services/imagePreprocessor';
import { detectPII } from '../../services/piiDetection';
import { ACTIONS, STATES } from '../../hooks/useChatStateMachine';

// Mocks
vi.mock('../../services/directLine', () => ({
    directLineService: {
        initialize: vi.fn(),
        subscribeToActivities: vi.fn(() => ({ unsubscribe: vi.fn() })),
        userId: 'user-123',
        username: 'User',
        directLine: {
            postActivity: vi.fn(() => ({ subscribe: (cb) => cb('id-123') }))
        },
        sendMessage: vi.fn(() => ({ subscribe: (cb) => cb('id-456') }))
    }
}));

vi.mock('../../services/imagePreprocessor', () => ({
    preprocessImage: vi.fn()
}));

vi.mock('../../services/piiDetection', () => ({
    detectPII: vi.fn()
}));

// Mock ImageMaskEditor to control interactions
vi.mock('../Image/ImageMaskEditor', () => ({
    default: ({ onConfirm, onCancel }) => (
        <div data-testid="image-mask-editor">
            <span>PII Review Mode</span>
            <button onClick={() => onConfirm(new File(['masked'], 'masked.png', { type: 'image/png' }))}>
                Confirm Mask
            </button>
            <button onClick={onCancel}>Cancel Mask</button>
        </div>
    )
}));

// Mock InputArea to simplify file selection
vi.mock('./InputArea', () => ({
    default: ({ onSendMessage, disabled }) => (
        <div data-testid="input-area">
            <button
                disabled={disabled}
                onClick={() => onSendMessage('Test Message', [new File(['dummy'], 'test.png', { type: 'image/png' })])}
            >
                Send Image
            </button>
            <button
                disabled={disabled}
                onClick={() => onSendMessage('Text Only', [])}
            >
                Send Text
            </button>
        </div>
    )
}));

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ChatWindow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<ChatWindow onClose={() => { }} />);
        expect(screen.getByText('AIチャットボット')).toBeDefined();
    });

    it('handles text-only message sending', async () => {
        render(<ChatWindow onClose={() => { }} />);

        fireEvent.click(screen.getByText('Send Text'));

        await waitFor(() => {
            // Check directLine postActivity called
            expect(directLineService.directLine.postActivity).toHaveBeenCalledWith(expect.objectContaining({
                text: 'Text Only',
                type: 'message'
            }));
        });
    });

    it('processes image and shows PII review when PII detected', async () => {
        // Setup Mocks
        const processedBlob = new Blob(['processed'], { type: 'image/png' });
        preprocessImage.mockResolvedValue(processedBlob);

        // Mock PII detection
        detectPII.mockResolvedValue([
            { type: 'EMAIL', text: 'test@example.com', bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, confidence: 90 }
        ]);

        render(<ChatWindow onClose={() => { }} />);

        // Trigger Send Image
        fireEvent.click(screen.getByText('Send Image'));

        // Verify Preprocessing Status
        await waitFor(() => {
            expect(screen.getByText('画像を処理中...')).toBeDefined();
        });

        // Verify Editor Appears
        await waitFor(() => {
            expect(screen.getByTestId('image-mask-editor')).toBeDefined();
        });
    });

    it('completes PII review and sends masked image', async () => {
        // Setup Mocks
        const processedBlob = new Blob(['processed'], { type: 'image/png' });
        preprocessImage.mockResolvedValue(processedBlob);
        detectPII.mockResolvedValue([
            { type: 'EMAIL', text: 'test@example.com', bbox: {}, confidence: 90 }
        ]);

        render(<ChatWindow onClose={() => { }} />);

        // Trigger Send Image
        fireEvent.click(screen.getByText('Send Image'));

        // Wait for Editor
        await waitFor(() => {
            expect(screen.getByTestId('image-mask-editor')).toBeDefined();
        });

        // Click Confirm in Editor
        fireEvent.click(screen.getByText('Confirm Mask'));

        // Verify Status changes to Sending
        await waitFor(() => {
            expect(screen.getByText('送信中...')).toBeDefined();
        });

        // Verify postActivity called with masked image
        await waitFor(() => {
            expect(directLineService.directLine.postActivity).toHaveBeenCalledWith(expect.objectContaining({
                text: 'Test Message',
                attachments: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'masked.png' // Ensure masked image is sent
                    })
                ])
            }));
        });
    });

    it('processes image and skips review when NO PII detected', async () => {
        const processedBlob = new Blob(['processed'], { type: 'image/png' });
        preprocessImage.mockResolvedValue(processedBlob);
        detectPII.mockResolvedValue([]); // No PII

        render(<ChatWindow onClose={() => { }} />);

        fireEvent.click(screen.getByText('Send Image'));

        // Should skip editor and go straight to sending
        await waitFor(() => {
            // Editor should NOT appear
            expect(screen.queryByTestId('image-mask-editor')).toBeNull();

            // Should call postActivity
            expect(directLineService.directLine.postActivity).toHaveBeenCalled();
        });
    });

    // Phase 4 Tests
    it('displays FAQ and handles vote (AUTO_RESOLVE)', async () => {
        let activityHandler;
        directLineService.subscribeToActivities.mockImplementation((handler) => {
            activityHandler = handler;
            return { unsubscribe: vi.fn() };
        });

        render(<ChatWindow onClose={() => { }} />);

        // Simulate Incoming Bot Message
        act(() => {
            if (activityHandler) {
                activityHandler({
                    from: { id: 'bot', name: 'Bot' },
                    type: 'message',
                    text: 'Here is the answer.',
                    id: 'msg-faq-1',
                    timestamp: new Date().toISOString(),
                    value: {
                        answerType: 'AUTO_RESOLVE',
                        faqLinks: [{ title: 'Help Link', url: 'http://example.com' }]
                    }
                });
            }
        });

        // Verify UI elements
        await waitFor(() => {
            expect(screen.getByText('Here is the answer.')).toBeDefined();
            expect(screen.getByText('Help Link')).toBeDefined();
            expect(screen.getByText('回答は役に立ちましたか？')).toBeDefined();
        });

        // Vote Up
        fireEvent.click(screen.getByText('👍'));

        // Verify Vote Transition
        await waitFor(() => {
            expect(screen.getByText('ご協力ありがとうございました')).toBeDefined();
        });
    });

    it('displays clarification options and sends selection', async () => {
        let activityHandler;
        directLineService.subscribeToActivities.mockImplementation((handler) => {
            activityHandler = handler;
            return { unsubscribe: vi.fn() };
        });

        render(<ChatWindow onClose={() => { }} />);

        act(() => {
            if (activityHandler) {
                activityHandler({
                    from: { id: 'bot', name: 'Bot' },
                    type: 'message',
                    text: 'Which one?',
                    id: 'msg-ask-1',
                    timestamp: new Date().toISOString(),
                    value: {
                        answerType: 'ASK_CLARIFICATION',
                        options: [{ label: 'Option A', value: 'Choice A' }, { label: 'Option B' }]
                    }
                });
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Which one?')).toBeDefined();
            expect(screen.getByText('Option A')).toBeDefined();
        });

        // Select Option
        fireEvent.click(screen.getByText('Option A'));

        // Verify Message Sent with Option Value
        await waitFor(() => {
            expect(directLineService.directLine.postActivity).toHaveBeenCalledWith(expect.objectContaining({
                text: 'Choice A',
                type: 'message'
            }));
        });
    });
});
