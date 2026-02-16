import React, { useEffect, useRef } from 'react';
import ResponseDisplay from './ResponseDisplay';

const MessageList = ({ messages, currentUserId, onVote, onOptionSelect }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const renderAttachments = (msg) => {
        if (!msg.attachments || msg.attachments.length === 0) return null;

        return (
            <div className="message-attachments" style={{ marginTop: '8px' }}>
                {msg.attachments.map((att, idx) => {
                    if (att.contentType && att.contentType.startsWith('image/')) {
                        return (
                            <img
                                key={idx}
                                src={att.contentUrl}
                                alt={att.name || 'attachment'}
                                style={{ maxWidth: '100%', borderRadius: '4px', marginTop: '4px' }}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    const renderContent = (msg, isUser) => {
        if (!isUser) {
            return (
                <>
                    <ResponseDisplay
                        activity={msg}
                        onVote={onVote}
                        onOptionSelect={onOptionSelect}
                    />
                    {renderAttachments(msg)}
                </>
            );
        }

        // User Message: Basic text rendering
        const textContent = msg.text ? (
            <div>
                {msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                        {line}
                        <br />
                    </React.Fragment>
                ))}
            </div>
        ) : null;

        return (
            <>
                {textContent}
                {renderAttachments(msg)}
            </>
        );
    };

    return (
        <div className="message-list">
            {messages.map((msg, index) => {
                const isUser = msg.from.id === currentUserId;
                return (
                    <div key={msg.id || index} className={`message ${isUser ? 'user' : 'bot'}`}>
                        <div className="message-content">
                            {renderContent(msg, isUser)}
                        </div>
                        <span className="message-time">
                            {/* Assuming timestamp is available, fall back to current time if needed (though usually present) */}
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
