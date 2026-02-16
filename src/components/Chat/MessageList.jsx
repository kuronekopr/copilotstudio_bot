import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUserId }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const renderContent = (msg) => {
        // Basic text rendering. In real app, markdown support is needed (e.g. react-markdown)
        // Here we split by newlines for basic formatting
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

        // Render attachments (images)
        const attachments = msg.attachments ? (
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
                    return null; // Handle other types if needed
                })}
            </div>
        ) : null;

        return (
            <>
                {textContent}
                {attachments}
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
                            {renderContent(msg)}
                        </div>
                        <span className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
