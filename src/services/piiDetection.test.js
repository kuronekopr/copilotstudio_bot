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
        const { detections } = await detectPII('http://mock-url/image.png');
        const emails = detections.filter(item => item.type === 'EMAIL');
        expect(emails).toHaveLength(1);
        expect(emails[0].text).toContain('test@example.com');
    });

    it('should detect phone numbers', async () => {
        const { detections } = await detectPII('http://mock-url/image.png');
        const phones = detections.filter(item => item.type === 'PHONE_NUMBER');
        expect(phones).toHaveLength(1);
        expect(phones[0].text).toContain('090-1234-5678');
    });

    it('should detect Romaji names', async () => {
        const { detections } = await detectPII('http://mock-url/image.png');
        const names = detections.filter(item => item.type === 'NAME');
        // "Tanaka Taro" should be detected
        expect(names.length).toBeGreaterThan(0);
        expect(names[0].text).toContain('Tanaka Taro');
    });

    it('should return correct stats', async () => {
        const { stats } = await detectPII('http://mock-url/image.png');
        // Mock data has 4 lines, all valid PII except the address one which is Japanese address but regex might miss it or hit it?
        // Wait, the mock data:
        // 1. Email (90)
        // 2. Phone (85)
        // 3. Name (88)
        // 4. Address (92) - regexes don't cover Japanese address in this file

        // Let's see what the regexes cover:
        // Email: hits "test@example.com"
        // Phone: hits "090-1234-5678"
        // Romaji Name: hits "Tanaka Taro"
        // Address: "住所は東京都千代田区1-1-1です" -> No regex match for this in piiDetection.js (only email, phone, romaji name)

        // So detections count should be 3.
        expect(stats.detectedCount).toBe(3);

        // Avg confidence: (90 + 85 + 88) / 3 = 263 / 3 = 87.666... -> 87.67
        expect(stats.confidenceAvg).toBe(87.67);
    });
});
