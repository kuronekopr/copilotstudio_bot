import React, { useRef, useState, useEffect } from 'react';
import { detectPII } from '../../services/piiDetectionMock';

const ImageMaskEditor = ({ imageFile, onConfirm, onCancel }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [masks, setMasks] = useState([]); // Array of {x, y, w, h}
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [imageObj, setImageObj] = useState(null);
    const [scale, setScale] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Load image and detect PII on mount
    useEffect(() => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = async () => {
            setImageObj(img);

            // Initial fit to container
            if (containerRef.current) {
                const containerW = containerRef.current.clientWidth;
                const containerH = containerRef.current.clientHeight;
                const scaleW = containerW / img.naturalWidth;
                const scaleH = containerH / img.naturalHeight;
                const s = Math.min(scaleW, scaleH, 1); // Don't scale up
                setScale(s);
            }

            // Auto detect
            try {
                const detected = await detectPII(img);
                setMasks(detected);
            } catch (e) {
                console.error("Detection failed", e);
            } finally {
                setIsLoading(false);
            }
        };
    }, [imageFile]);

    // Redraw canvas whenever masks or image changes
    useEffect(() => {
        if (!canvasRef.current || !imageObj) return;

        const ctx = canvasRef.current.getContext('2d');
        const width = imageObj.naturalWidth * scale;
        const height = imageObj.naturalHeight * scale;

        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Draw image
        ctx.drawImage(imageObj, 0, 0, width, height);

        // Draw masks
        ctx.fillStyle = 'black';
        masks.forEach(mask => {
            ctx.fillRect(mask.x * scale, mask.y * scale, mask.w * scale, mask.h * scale);
        });

        // Draw current selection if drawing
        if (isDrawing) {
            // Handled in mouseMove but finalized here? No, mouseMove draws on top of clean state usually.
            // Actually, for simplicity, we just rely on the masks state.
            // During drag, we might want a temporary visual.
        }

    }, [imageObj, masks, scale]);

    const getCanvasCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    };

    const handleMouseDown = (e) => {
        const pos = getCanvasCoords(e);

        // Check if clicking existing mask to remove
        const clickedMaskIndex = masks.findIndex(m =>
            pos.x >= m.x && pos.x <= m.x + m.w &&
            pos.y >= m.y && pos.y <= m.y + m.h
        );

        if (clickedMaskIndex >= 0) {
            // Remove mask
            const newMasks = [...masks];
            newMasks.splice(clickedMaskIndex, 1);
            setMasks(newMasks);
            return;
        }

        // Start drawing
        setIsDrawing(true);
        setStartPos(pos);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !canvasRef.current) return;
        const pos = getCanvasCoords(e);

        const ctx = canvasRef.current.getContext('2d');

        // Redraw base
        const width = imageObj.naturalWidth * scale;
        const height = imageObj.naturalHeight * scale;
        ctx.drawImage(imageObj, 0, 0, width, height);

        ctx.fillStyle = 'black';
        masks.forEach(mask => {
            ctx.fillRect(mask.x * scale, mask.y * scale, mask.w * scale, mask.h * scale);
        });

        // Draw current rect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const w = pos.x - startPos.x;
        const h = pos.y - startPos.y;
        ctx.fillRect(startPos.x * scale, startPos.y * scale, w * scale, h * scale);
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const pos = getCanvasCoords(e);

        const w = pos.x - startPos.x;
        const h = pos.y - startPos.y;

        // Normalize rect (handle negative width/height)
        const newMask = {
            x: w < 0 ? pos.x : startPos.x,
            y: h < 0 ? pos.y : startPos.y,
            w: Math.abs(w),
            h: Math.abs(h)
        };

        if (newMask.w > 5 && newMask.h > 5) { // Minimum size filter
            setMasks([...masks, newMask]);
        }
    };

    const handleCreateMaskedImage = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL(imageFile.type);

        // Convert DataURL to File object
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `masked_${imageFile.name}`, { type: imageFile.type });
                onConfirm(file);
            });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            color: 'white'
        }}>
            <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <h3>PII マスクエディタ</h3>
                <p style={{ fontSize: '0.9rem' }}>ドラッグして隠したい部分を選択してください。黒い四角をクリックすると削除できます。</p>
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    maxWidth: '90%',
                    maxHeight: '70vh',
                    border: '2px solid #555',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#333'
                }}
            >
                {isLoading && <div style={{ position: 'absolute' }}>検出中...</div>}
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{ cursor: 'crosshair', display: 'block' }}
                />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={onCancel}
                    style={{ padding: '10px 20px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    キャンセル (元画像に戻る)
                </button>
                <button
                    onClick={handleCreateMaskedImage}
                    style={{ padding: '10px 20px', background: '#0078D4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    編集完了 (この状態で保存)
                </button>
            </div>
        </div>
    );
};

export default ImageMaskEditor;
