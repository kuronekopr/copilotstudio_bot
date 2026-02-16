import React, { useState, useRef, useEffect } from 'react';
import ImageMaskEditor from '../Image/ImageMaskEditor';
import { validateImage, generateImageHash } from '../../services/imagePreprocessor';

/**
 * Input Area component.
 * Handles text input, file selection (click + drag/drop), and clipboard paste.
 * Images must go through PII Masking Editor before being added to send queue.
 */
const InputArea = ({ onSendMessage, disabled = false }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]); // Array of File objects (Masked)
    const [pendingImage, setPendingImage] = useState(null); // Image currently being edited
    const [isDragging, setIsDragging] = useState(false);

    // Use a queue for mulitple files drop/paste? 
    // To handle multiple files, we process them one by one.
    const [pendingQueue, setPendingQueue] = useState([]);

    // Store hashes of currently selected images to prevent duplicates
    const [imageHashes, setImageHashes] = useState(new Set());

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
        if (disabled) return;
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
        if (disabled) return;
        if (e.target.files) {
            addImagesToQueue(Array.from(e.target.files));
        }
        // Reset inputs
        e.target.value = '';
    };

    const addImagesToQueue = async (newFiles) => {
        const validFiles = [];

        for (const file of newFiles) {
            // 1. Validation
            const validation = validateImage(file);
            if (!validation.valid) {
                alert(`${file.name}: ${validation.error}`);
                continue;
            }

            // 2. Duplication Check
            try {
                const hash = await generateImageHash(file);
                if (imageHashes.has(hash)) {
                    alert(`${file.name}: この画像はすでに選択されています。`);
                    continue;
                }

                // Attach hash to file object for later reference
                file._hash = hash;
                validFiles.push(file);
            } catch (e) {
                console.error('Hash generation failed', e);
                // Allow processing if hash fails
                validFiles.push(file);
            }
        }

        if (images.length + pendingQueue.length + validFiles.length > 5) {
            alert('画像は最大5枚までです。');
            return;
        }

        setPendingQueue(prev => [...prev, ...validFiles]);
    };

    const removeImage = (index) => {
        const fileToRemove = images[index];
        setImages(prev => prev.filter((_, i) => i !== index));

        // Remove hash
        if (fileToRemove._hash) {
            setImageHashes(prev => {
                const next = new Set(prev);
                next.delete(fileToRemove._hash);
                return next;
            });
        }
    };

    const handleDragOver = (e) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addImagesToQueue(Array.from(e.dataTransfer.files));
        }
    };

    const handleSendClick = () => {
        if (disabled) return;
        if (!text.trim() && images.length === 0) return;

        // Direct Send logic
        onSendMessage(text, images);
        setText('');
        setImages([]);
        setImageHashes(new Set());
    };

    // Editor Callbacks
    const handleEditorConfirm = (maskedFile) => {
        // Track hash of confirmed image (using original image's hash)
        if (pendingImage?._hash) {
            setImageHashes(prev => new Set(prev).add(pendingImage._hash));
            maskedFile._hash = pendingImage._hash;
        }

        setImages(prev => [...prev, maskedFile]);
        setPendingImage(null);
    };

    const handleEditorCancel = () => {
        setPendingImage(null);
    };

    return (
        <div
            className={`input-area ${disabled ? 'disabled' : ''}`}
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
