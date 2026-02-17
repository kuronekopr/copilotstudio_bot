import { DirectLine } from 'botframework-directlinejs';
import { v4 as uuidv4 } from 'uuid';

// In a real app, you might fetch this from a protected API to avoid exposing secrets
// For this demo/POC, we use a placeholder or public token if available.
// NOTE: You need a Direct Line Token or Secret here.
const DIRECT_LINE_SECRET = import.meta.env.VITE_DIRECT_LINE_SECRET || 'YOUR_DIRECT_LINE_SECRET_HERE';

class DirectLineService {
    constructor() {
        this.directLine = null;
        this.userId = uuidv4();
        this.username = `User-${this.userId.substring(0, 8)}`;
    }

    initialize(token = null) {
        // Priority: Token > Secret
        if (token) {
            this.directLine = new DirectLine({ token });
        } else if (DIRECT_LINE_SECRET && DIRECT_LINE_SECRET !== 'YOUR_DIRECT_LINE_SECRET_HERE') {
            this.directLine = new DirectLine({ secret: DIRECT_LINE_SECRET });
        } else {
            console.warn('DirectLine secret is missing. Chat will not work until configured.');
            // ---------------------------------------------------------
            // Fallback for UI testing (MOCK IMPLEMENTATION)
            // WARNING: Remove this mock logic in production environment
            // ---------------------------------------------------------
            const listeners = [];
            this.directLine = {
                activity$: {
                    subscribe: (callback) => {
                        listeners.push(callback);
                        return {
                            unsubscribe: () => {
                                const idx = listeners.indexOf(callback);
                                if (idx > -1) listeners.splice(idx, 1);
                            }
                        };
                    }
                },
                postActivity: (userActivity) => ({
                    subscribe: (observerOrNext, onError, onComplete) => {
                        console.log('Mock postActivity called', userActivity);
                        const id = 'mock-id-' + Date.now();

                        // 1. Acknowledge send success
                        if (typeof observerOrNext === 'function') {
                            observerOrNext(id);
                        } else if (observerOrNext && typeof observerOrNext.next === 'function') {
                            observerOrNext.next(id);
                            if (observerOrNext.complete) observerOrNext.complete();
                        }

                        // 2. Simulate Bot Response
                        setTimeout(() => {
                            let botReply = {
                                from: { id: 'bot', name: 'AI Assistant' },
                                type: 'message',
                                id: 'bot-msg-' + Date.now(),
                                timestamp: new Date().toISOString(),
                                value: {}
                            };

                            const text = (userActivity.text || '').toLowerCase();

                            if (text.includes('agent') || text.includes('human') || text.includes('escalate')) {
                                // ESCALATE Pattern
                                botReply.text = '担当者に転送しますか？\n現在、電話窓口は混雑しています。';
                                botReply.value = {
                                    answerType: 'ESCALATE',
                                    reason: 'User requested agent'
                                };
                            } else if (text.includes('clarify') || text.includes('option')) {
                                // ASK_CLARIFICATION Pattern
                                botReply.text = 'どちらの製品について知りたいですか？';
                                botReply.value = {
                                    answerType: 'ASK_CLARIFICATION',
                                    options: [
                                        { label: 'Cloud Service A', value: 'Service A' },
                                        { label: 'On-Premise B', value: 'Product B' }
                                    ]
                                };
                            } else {
                                // DEFAULT: AUTO_RESOLVE Pattern
                                botReply.text = `【状況整理】\nユーザーは画像からエラーコード「E-1234」を確認しました。\n\n【確認された事実】\n- ログイン画面でのエラー発生\n- 再起動後も解消せず\n\n【想定原因】\n1. 認証サーバーとの通信タイムアウト\n2. アプリケーションキャッシュの破損\n\n【解決手順】\n1. ブラウザのキャッシュをクリアしてください\n2. 5分後に再試行してください`;
                                botReply.value = {
                                    answerType: 'AUTO_RESOLVE',
                                    faqLinks: [
                                        { title: '認証エラーE-1234について', url: '#' },
                                        { title: 'キャッシュクリアの手順', url: '#' }
                                    ]
                                };
                            }

                            listeners.forEach(cb => cb(botReply));
                        }, 1000);

                        return { unsubscribe: () => { } };
                    }
                })
            };
        }
    }

    sendMessage(text) {
        return this.directLine.postActivity({
            from: { id: this.userId, name: this.username },
            type: 'message',
            text: text
        });
    }

    sendImage(file, text = '') {
        // For Direct Line, we usually send attachments.
        // Converting file to base64 or using contentUrl if uploaded to blob.
        // Here we will use Base64 for simplicity in this demo, 
        // BUT typically Copilot Studio prefers a URL or specific attachment structure.

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result;

                const activity = {
                    from: { id: this.userId, name: this.username },
                    type: 'message',
                    text: text,
                    attachments: [{
                        contentType: file.type,
                        contentUrl: base64Data,
                        name: file.name
                    }]
                };

                this.directLine.postActivity(activity).subscribe(
                    id => resolve(id),
                    err => reject(err)
                );
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    subscribeToActivities(callback) {
        if (!this.directLine) return;
        return this.directLine.activity$.subscribe(activity => {
            // Filter out own messages if needed, or just pass everything
            // Usually we want to see what we sent as well (handled by UI optimistic update usually)
            // But DL echoes back.
            if (activity.type === 'message' && activity.from.id !== this.userId) {
                callback(activity);
            }
        });
    }
}

export const directLineService = new DirectLineService();
