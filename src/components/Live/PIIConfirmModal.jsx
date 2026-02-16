import React, { useState } from 'react';

const PIIConfirmModal = ({ images, onConfirm, onCancel }) => {
    const [checked, setChecked] = useState(false);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000
        }}>
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '8px',
                width: '500px',
                maxWidth: '90%'
            }}>
                <h2 style={{ marginTop: 0 }}>送信前確認</h2>
                <p>画像を送信する前に、個人情報（PII）が含まれていないか、またはマスクされているか確認してください。</p>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    padding: '10px 0',
                    marginBottom: '20px'
                }}>
                    {images.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                            <img
                                src={URL.createObjectURL(file)}
                                alt="preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                            />
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setChecked(e.target.checked)}
                        />
                        <span>この画像に個人情報が含まれていない、または適切にマスクされていることを確認しました。</span>
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #ccc',
                            background: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!checked}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: checked ? '#0078D4' : '#ccc',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: checked ? 'pointer' : 'not-allowed'
                        }}
                    >
                        送信する
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PIIConfirmModal;
