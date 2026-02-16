import React, { useState, useRef, useEffect } from 'react';
import PIIConfirmModal from '../Live/PIIConfirmModal';

const InputArea = ({ onSendMessage }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]); // Array of File objects
    const [showPIIModal, setShowPIIModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleTextChange = (e) => {
        setText(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            addImages(Array.from(e.target.files));
        }
    };

    const addImages = (newFiles) => {
        const validImages = newFiles.filter(file => file.type.startsWith('image/'));
        if (images.length + validImages.length > 5) {
            alert('画像は最大5枚までです。');
            return;
        }
        setImages(prev => [...prev, ...validImages]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addImages(Array.from(e.dataTransfer.files));
        }
    };

    const handleSendClick = () => {
        if (!text.trim() && images.length === 0) return;

        if (images.length > 0) {
            setShowPIIModal(true);
        } else {
            onSendMessage(text, []);
            setText('');
        }
    };

    const handleConfirmPII = () => {
        onSendMessage(text, images);
        setText('');
        setImages([]);
        setShowPIIModal(false);
    };

    return (
        <div
            className="input-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ position: 'relative' }}
        >
            {isDragging && (
                <div className="drag-overlay">
                    ここに画像をドロップ
                </div>
            )}

            {images.length > 0 && (
                <div className="image-previews">
                    {images.map((file, idx) => (
                        <div key={idx} className="preview-item">
                            <img src={URL.createObjectURL(file)} alt="preview" />
                            <button
                                className="remove-img-btn"
                                onClick={() => removeImage(idx)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="input-row">
                <button
                    className="attach-btn"
                    onClick={() => fileInputRef.current.click()}
                    title="画像を追加"
                    disabled={images.length >= 5}
                >
                    📎
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                />

                <textarea
                    className="input-field"
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力..."
                    rows={1}
                />

                <button
                    className="send-btn"
                    onClick={handleSendClick}
                    disabled={!text.trim() && images.length === 0}
                >
                    ➤
                </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'right', paddingRight: '10px' }}>
                画像: {images.length}/5
            </div>

            {showPIIModal && (
                <PIIConfirmModal
                    images={images}
                    onConfirm={handleConfirmPII}
                    onCancel={() => setShowPIIModal(false)}
                />
            )}
        </div>
    );
};

export default InputArea;
