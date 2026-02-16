import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import StatusIndicator from './StatusIndicator';
import { directLineService } from '../../services/directLine';
import { useChatStateMachine, STATES, ACTIONS, ANSWER_TYPES } from '../../hooks/useChatStateMachine';
import { preprocessImage } from '../../services/imagePreprocessor';
import ImageMaskEditor from '../Image/ImageMaskEditor';
import { detectPII } from '../../services/piiDetection';

const ChatWindow = ({ onClose }) => {
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const { state: chatState, dispatch, isState, statusMessage, isProcessing } = useChatStateMachine();

    // PII Review State
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [reviewedImages, setReviewedImages] = useState([]);

    useEffect(() => {
        // Initialize Direct Line
        directLineService.initialize();
        setConnectionStatus('Connected');

        const subscription = directLineService.subscribeToActivities((activity) => {
            setMessages(prev => [...prev, activity]);

            // When bot responds, transition state
            if (chatState.currentState === STATES.WAITING_RESPONSE) {
                // Determine answer type from activity (customize based on bot payload)
                const answerType = activity.value?.answerType || ANSWER_TYPES.AUTO_RESOLVE;
                dispatch({
                    type: ACTIONS.RESPONSE_RECEIVED,
                    payload: { answerType, data: activity },
                });
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // Side Effect: Image Preprocessing & PII Detection
    useEffect(() => {
        if (chatState.currentState === STATES.PREPROCESSING) {
            const processPipeline = async () => {
                try {
                    const imagesToProcess = chatState.images;

                    // 1. Preprocess (Resize/EXIF)
                    const processedBlobs = await Promise.all(
                        imagesToProcess.map(img => preprocessImage(img))
                    );

                    dispatch({
                        type: ACTIONS.PREPROCESSING_DONE,
                        payload: { processedImages: processedBlobs }
                    });

                    // 2. PII Detection
                    const imageUrls = processedBlobs.map(blob => URL.createObjectURL(blob));

                    let allDetections = [];
                    for (let i = 0; i < imageUrls.length; i++) {
                        const dets = await detectPII(imageUrls[i]);
                        // Attach image index to detection for UI mapping
                        const detsWithIndex = dets.map(d => ({ ...d, imageIndex: i }));
                        allDetections = [...allDetections, ...detsWithIndex];
                    }

                    // Cleanup URLs
                    imageUrls.forEach(url => URL.revokeObjectURL(url));

                    dispatch({
                        type: ACTIONS.PII_DETECTION_DONE,
                        payload: { detections: allDetections }
                    });

                } catch (error) {
                    console.error('Processing/PII Detection failed', error);
                    dispatch({ type: ACTIONS.PREPROCESSING_ERROR, payload: { error: error.message } });
                }
            };
            processPipeline();
        }
    }, [chatState.currentState, chatState.images, dispatch]);

    // Side Effect: Sending Message
    useEffect(() => {
        if (chatState.currentState === STATES.SENDING) {
            const sendMessage = async () => {
                try {
                    // Prepare attachments from available source
                    const sourceImages = (chatState.maskedImages.length > 0)
                        ? chatState.maskedImages
                        : (chatState.processedImages.length > 0 ? chatState.processedImages : chatState.images);

                    let attachments = [];
                    if (sourceImages.length > 0) {
                        attachments = await Promise.all(sourceImages.map(imageFile => {
                            return new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve({
                                    contentType: imageFile.type,
                                    contentUrl: reader.result,
                                    name: imageFile.name || 'image.png'
                                });
                                reader.onerror = reject;
                                reader.readAsDataURL(imageFile);
                            });
                        }));
                    }

                    const activity = {
                        from: { id: directLineService.userId, name: directLineService.username },
                        type: 'message',
                        text: chatState.pendingText || '',
                        attachments: attachments
                    };

                    directLineService.directLine.postActivity(activity).subscribe(
                        id => {
                            console.log('Message sent', id);
                            dispatch({ type: ACTIONS.SEND_SUCCESS });
                        },
                        err => {
                            console.error('Error sending message', err);
                            dispatch({ type: ACTIONS.SEND_ERROR, payload: { error: err.message } });
                        }
                    );

                } catch (error) {
                    console.error('Send failed preparation', error);
                    dispatch({ type: ACTIONS.SEND_ERROR, payload: { error: error.message } });
                }
            };
            sendMessage();
        }
    }, [chatState.currentState, chatState.images, chatState.processedImages, chatState.maskedImages, chatState.pendingText, dispatch]);

    // Reset review state on entering PII_REVIEW
    useEffect(() => {
        if (chatState.currentState === STATES.PII_REVIEW) {
            setCurrentReviewIndex(0);
            setReviewedImages([]);
        }
    }, [chatState.currentState]);

    const handleReviewConfirm = (maskedFile) => {
        const newReviewed = [...reviewedImages, maskedFile];
        setReviewedImages(newReviewed);

        if (currentReviewIndex < chatState.images.length - 1) {
            setCurrentReviewIndex(prev => prev + 1);
        } else {
            // All images reviewed
            dispatch({ type: ACTIONS.CONFIRM_PII_REVIEW, payload: { maskedImages: newReviewed } });
        }
    };

    const handleReviewCancel = () => {
        // Cancel entire send process?
        dispatch({ type: ACTIONS.RESET });
    };

    const handleSendMessage = async (text, images) => {
        // Optimistic Update
        const tempId = Date.now().toString();
        const userMessage = {
            id: tempId,
            from: { id: directLineService.userId, name: directLineService.username },
            text: text,
            timestamp: new Date().toISOString(),
            attachments: images.map(file => ({
                contentType: file.type,
                contentUrl: URL.createObjectURL(file), // Note: This URL might leak memory if not revoked, but usually fine for chat history for session
                name: file.name
            }))
        };

        setMessages(prev => [...prev, userMessage]);

        // Transition state
        if (images.length > 0) {
            dispatch({ type: ACTIONS.SELECT_IMAGE, payload: { images, text } });
            dispatch({ type: ACTIONS.START_PREPROCESSING });
        } else {
            dispatch({ type: ACTIONS.SEND_TEXT_ONLY, payload: { text } });
        }
    };

    // Error retry handler
    const handleRetry = () => {
        dispatch({ type: ACTIONS.RETRY });
    };

    // Reset handler
    const handleReset = () => {
        dispatch({ type: ACTIONS.RESET });
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <span>AIチャットボット</span>
                <div className="header-right">
                    <span className={`connection-dot ${connectionStatus === 'Connected' ? 'connected' : ''}`} />
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
            </div>

            {/* Debug: State indicator (development only) */}
            {import.meta.env.DEV && (
                <div className="state-debug-bar">
                    状態: {chatState.currentState}
                    {chatState.retryCount > 0 && ` (リトライ: ${chatState.retryCount}/3)`}
                </div>
            )}

            <MessageList messages={messages} currentUserId={directLineService.userId} />

            {/* Status Indicator (spinner during processing) */}
            <StatusIndicator message={statusMessage} isVisible={isProcessing} />

            {/* Error Display */}
            {isState(STATES.ERROR) && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-message">{chatState.error?.message}</span>
                    <div className="error-actions">
                        {chatState.retryCount < 3 && (
                            <button className="error-retry-btn" onClick={handleRetry}>
                                再度送信
                            </button>
                        )}
                        <button className="error-cancel-btn" onClick={handleReset}>
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* End Session Display */}
            {isState(STATES.END) && (
                <div className="end-session-banner">
                    ご利用ありがとうございました
                </div>
            )}

            <InputArea
                onSendMessage={handleSendMessage}
                disabled={isProcessing || isState(STATES.END, STATES.ERROR)}
            />

            {/* PII Review Modal */}
            {isState(STATES.PII_REVIEW) && chatState.images[currentReviewIndex] && (
                <ImageMaskEditor
                    imageFile={chatState.images[currentReviewIndex]}
                    initialDetections={chatState.piiDetections.filter(d => d.imageIndex === currentReviewIndex)}
                    onConfirm={handleReviewConfirm}
                    onCancel={handleReviewCancel}
                />
            )}
        </div>
    );
};

export default ChatWindow;
