import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { detectPII } from './piiDetection';

describe('PII Detection Service', () => {
    beforeAll(() => {
        // Mock global Tesseract from CDN
        global.Tesseract = {
            createWorker: vi.fn().mockResolvedValue({
                loadLanguage: vi.fn(),
                initialize: vi.fn(),
                setParameters: vi.fn(),
                recognize: vi.fn().mockResolvedValue({
                    data: {
                        lines: [
                            { text: 'My email is test@example.com', bbox: { x0: 10, y0: 10, x1: 100, y1: 20 }, confidence: 90 },
                            { text: 'Call me at 090-1234-5678', bbox: { x0: 10, y0: 30, x1: 100, y1: 40 }, confidence: 85 },
                            { text: 'I am Tanaka Taro', bbox: { x0: 10, y0: 50, x1: 100, y1: 60 }, confidence: 88 },
                            { text: '住所は東京都千代田区1-1-1です', bbox: { x0: 10, y0: 70, x1: 100, y1: 80 }, confidence: 92 }
                        ]
                    }
                }),
                terminate: vi.fn()
            })
        };
    });

    afterAll(() => {
        delete global.Tesseract;
    });

    it('should detect emails', async () => {
        const result = await detectPII('http://mock-url/image.png');
        const emails = result.filter(item => item.type === 'EMAIL');
        expect(emails).toHaveLength(1);
        expect(emails[0].text).toContain('test@example.com');
    });

    it('should detect phone numbers', async () => {
        const result = await detectPII('http://mock-url/image.png');
        const phones = result.filter(item => item.type === 'PHONE_NUMBER');
        expect(phones).toHaveLength(1);
        expect(phones[0].text).toContain('090-1234-5678');
    });

    it('should detect Romaji names', async () => {
        const result = await detectPII('http://mock-url/image.png');
        const names = result.filter(item => item.type === 'NAME');
        // "Tanaka Taro" should be detected
        expect(names.length).toBeGreaterThan(0);
        expect(names[0].text).toContain('Tanaka Taro');
    });
});
