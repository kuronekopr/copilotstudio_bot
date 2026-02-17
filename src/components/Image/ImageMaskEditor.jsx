import React, { useRef, useState, useEffect } from 'react';
import { detectPII } from '../../services/piiDetection';

const ImageMaskEditor = ({ imageFile, initialDetections = null, onConfirm, onCancel }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [masks, setMasks] = useState([]); // Array of {x, y, w, h}
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [imageObj, setImageObj] = useState(null);
    const [scale, setScale] = useState(1);
    const [isLoading, setIsLoading] = useState(!initialDetections);

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

                // Fit to container, allow upscaling if image is small
                // Use 0.9 factor to leave some margin
                let s = Math.min(scaleW, scaleH) * 0.9;
                setScale(s);
            }

            // Auto detect or use provided detections
            if (initialDetections) {
                // Convert detector format to mask format
                // Detector: { bbox: {x0, y0, x1, y1} }
                // Mask: { x, y, w, h }
                const convertedMasks = initialDetections.map(d => ({
                    x: d.bbox.x0,
                    y: d.bbox.y0,
                    w: d.bbox.x1 - d.bbox.x0,
                    h: d.bbox.y1 - d.bbox.y0
                }));
                setMasks(convertedMasks);
                setIsLoading(false);
            } else {
                try {
                    // Start detection if not provided
                    const { detections } = await detectPII(img.src);

                    const convertedMasks = detections.map(d => ({
                        x: d.bbox.x0,
                        y: d.bbox.y0,
                        w: d.bbox.x1 - d.bbox.x0,
                        h: d.bbox.y1 - d.bbox.y0
                    }));
                    setMasks(convertedMasks);
                } catch (e) {
                    console.error("Detection failed", e);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        return () => {
            URL.revokeObjectURL(img.src);
        };
    }, [imageFile, initialDetections]);

    // Redraw canvas whenever masks or image changes
    useEffect(() => {
        if (!canvasRef.current || !imageObj) return;

        const ctx = canvasRef.current.getContext('2d');

        // Canvas size equals displayed size
        const width = imageObj.naturalWidth * scale;
        const height = imageObj.naturalHeight * scale;

        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Draw image
        // Note: drawImage takes destination w/h
        ctx.drawImage(imageObj, 0, 0, width, height);

        // Draw masks
        ctx.fillStyle = 'black';
        masks.forEach(mask => {
            ctx.fillRect(mask.x * scale, mask.y * scale, mask.w * scale, mask.h * scale);
        });

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

        // We need to generate the FINAL image at ORIGINAL resolution, not screen resolution
        // So we create a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageObj.naturalWidth;
        tempCanvas.height = imageObj.naturalHeight;
        const ctx = tempCanvas.getContext('2d');

        // Draw original image
        ctx.drawImage(imageObj, 0, 0);

        // Draw masks (using original coordinates)
        ctx.fillStyle = 'black';
        masks.forEach(mask => {
            ctx.fillRect(mask.x, mask.y, mask.w, mask.h);
        });

        const dataUrl = tempCanvas.toDataURL(imageFile.type);

        // Convert DataURL to File object
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `masked_${imageFile.name}`, { type: imageFile.type });
                onConfirm(file);
            });
    };

    const handleZoomIn = () => setScale(prev => prev * 1.2);
    const handleZoomOut = () => setScale(prev => prev / 1.2);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '5px' }}>
                    <button onClick={handleZoomOut} style={{ padding: '4px 12px', cursor: 'pointer', color: 'black' }}>-</button>
                    <span style={{ display: 'inline-block', minWidth: '50px' }}>{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} style={{ padding: '4px 12px', cursor: 'pointer', color: 'black' }}>+</button>
                </div>
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: '90vw',
                    height: '75vh',
                    border: '2px solid #555',
                    overflow: 'auto', // Allow scrolling if zoomed in
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#333'
                }}
            >
                {isLoading && <div style={{ position: 'absolute' }}>検出中...</div>}

                {/* Wrapper to handle centering when smaller, scrolling when larger */}
                <div style={{ position: 'relative' }}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        style={{ cursor: 'crosshair', display: 'block' }}
                    />
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={onCancel}
                    style={{ padding: '10px 20px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    キャンセル
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
