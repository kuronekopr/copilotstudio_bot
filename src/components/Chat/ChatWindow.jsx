import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { directLineService } from '../../services/directLine';

const ChatWindow = ({ onClose }) => {
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');

    useEffect(() => {
        // Initialize Direct Line
        directLineService.initialize();
        setConnectionStatus('Connected');

        const subscription = directLineService.subscribeToActivities((activity) => {
            setMessages(prev => [...prev, activity]);
        });

        // Send initial greeting or event if needed
        // directLineService.sendEvent('startConversation');

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

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
                contentUrl: URL.createObjectURL(file), // Local preview URL
                name: file.name
            }))
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            if (images.length > 0) {
                // Send images one by one or as a batch depending on API support.
                // DirectLine supports multiple attachments.
                // However, our service wrapper currently handles one by one for simplicity + promise logic.
                // Let's loop for now (or update service to handle array).
                // Since InputArea passes array, and our simple wrapper assumed single file,
                // let's just send the first text with all images if possible, 
                // OR send text then images.
                // Actually, let's just update the loop here to send one activity with all attachments.

                // REVISIT: Service wrapper 'sendImage' is single file. 
                // Logic: Send text with first image? Or send text then images?
                // Better: Send one message with text AND all images. 
                // But we need to convert all to Base64 first.

                const attachments = await Promise.all(images.map(imageFile => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({
                            contentType: imageFile.type,
                            contentUrl: reader.result,
                            name: imageFile.name
                        });
                        reader.onerror = reject;
                        reader.readAsDataURL(imageFile);
                    });
                }));

                const activity = {
                    from: { id: directLineService.userId, name: directLineService.username },
                    type: 'message',
                    text: text,
                    attachments: attachments
                };

                directLineService.directLine.postActivity(activity).subscribe(
                    id => console.log('Message sent', id),
                    err => console.error('Error sending message', err)
                );

            } else {
                await directLineService.sendMessage(text).subscribe();
            }
        } catch (error) {
            console.error('Failed to send', error);
            // Show error state in message
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, failed: true } : m));
        }
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <span>AIチャットボット</span>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <MessageList messages={messages} currentUserId={directLineService.userId} />

            <InputArea onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatWindow;
