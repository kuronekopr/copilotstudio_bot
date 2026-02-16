import React, { useState, useRef, useEffect } from 'react';
import ImageMaskEditor from '../Image/ImageMaskEditor';

/**
 * Input Area component.
 * Handles text input, file selection (click + drag/drop), and clipboard paste.
 * Images must go through PII Masking Editor before being added to send queue.
 */
const InputArea = ({ onSendMessage }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]); // Array of File objects (Masked)
    const [pendingImage, setPendingImage] = useState(null); // Image currently being edited
    const [isDragging, setIsDragging] = useState(false);

    // Use a queue for mulitple files drop/paste? 
    // For simplicity, we process one by one if multiple dropped.
    // Or better: store pendingImages queue.
    const [pendingQueue, setPendingQueue] = useState([]);

    const fileInputRef = useRef(null);

    useEffect(() => {
        // If we have items in queue and no editor open, open next
        if (pendingQueue.length > 0 && !pendingImage) {
            const nextImage = pendingQueue[0];
            setPendingImage(nextImage);
            setPendingQueue(prev => prev.slice(1));
        }
    }, [pendingQueue, pendingImage]);


    const handleTextChange = (e) => {
        setText(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (items) {
            const newImages = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    newImages.push(blob);
                }
            }
            if (newImages.length > 0) {
                // Prevent default paste of image text representation
                e.preventDefault();
                addImagesToQueue(newImages);
            }
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            addImagesToQueue(Array.from(e.target.files));
        }
        // Reset inputs
        e.target.value = '';
    };

    const addImagesToQueue = (newFiles) => {
        const validImages = newFiles.filter(file => file.type.startsWith('image/'));

        if (images.length + pendingQueue.length + validImages.length > 5) {
            alert('画像は最大5枚までです。');
            // Should we truncate? Let's just return for now.
            return;
        }

        setPendingQueue(prev => [...prev, ...validImages]);
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
            addImagesToQueue(Array.from(e.dataTransfer.files));
        }
    };

    const handleSendClick = () => {
        if (!text.trim() && images.length === 0) return;

        // Direct Send (PII Check is done during adding)
        onSendMessage(text, images);
        setText('');
        setImages([]);
    };

    // Editor Callbacks
    const handleEditorConfirm = (maskedFile) => {
        setImages(prev => [...prev, maskedFile]);
        setPendingImage(null);
    };

    const handleEditorCancel = () => {
        // Discard current image
        setPendingImage(null);
    };

    return (
        <div
            className="input-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
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
                    placeholder="メッセージを入力... (Ctrl+Vで画像貼り付け可)"
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
                画像: {images.length}/5 (PIIマスク済)
            </div>

            {pendingImage && (
                <ImageMaskEditor
                    imageFile={pendingImage}
                    onConfirm={handleEditorConfirm}
                    onCancel={handleEditorCancel}
                />
            )}
        </div>
    );
};

export default InputArea;
