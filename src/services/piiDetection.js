/**
 * PII Detection Service using Tesseract.js (CDN version)
 * Detects EMAIL, PHONE_NUMBER, and NAME (Romaji) from image text.
 */

// Regex definitions
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phoneRegex = /(\d{2,4}-\d{2,4}-\d{4})|(\d{10,11})/g;
// Simple Romaji Name: Capitalized Word + Space + Capitalized Word (2-3 chars min)
const romajiNameRegex = /([A-Z][a-z]{1,}\s[A-Z][a-z]{1,})/g;

const UI_LABELS = ['Cancel', 'OK', 'Send', 'Upload']; // Exclude common UI text

/**
 * Detect PII in the given image URL/Blob.
 * @param {string} imageUrl 
 * @returns {Promise<Array>} Array of detections { type, text, bbox, confidence }
 */
export async function detectPII(imageUrl) {
    // Check if Tesseract is loaded via CDN
    if (!window.Tesseract) {
        console.error('Tesseract.js not loaded from CDN');
        throw new Error('Tesseract script not loaded');
    }

    const worker = await window.Tesseract.createWorker();

    try {
        await worker.loadLanguage('eng+jpn');
        await worker.initialize('eng+jpn');

        const { data } = await worker.recognize(imageUrl);
        const detections = [];

        // Analyze lines
        if (data && data.lines) {
            data.lines.forEach(line => {
                const text = line.text;
                const bbox = line.bbox; // {x0, y0, x1, y1}
                const confidence = line.confidence;

                // Skip low confidence or empty lines
                if (confidence < 30 || !text || !text.trim()) return;

                // Skip UI labels
                if (UI_LABELS.includes(text.trim())) return;

                // 1. Email
                const emails = text.match(emailRegex);
                if (emails) {
                    emails.forEach(match => {
                        detections.push({ type: 'EMAIL', text: match, bbox, confidence });
                    });
                }

                // 2. Phone
                const phones = text.match(phoneRegex);
                if (phones) {
                    phones.forEach(match => {
                        detections.push({ type: 'PHONE_NUMBER', text: match, bbox, confidence });
                    });
                }

                // 3. Romaji Name
                const names = text.match(romajiNameRegex);
                if (names) {
                    names.forEach(match => {
                        detections.push({ type: 'NAME', text: match, bbox, confidence });
                    });
                }
            });
        }

        await worker.terminate();

        // Calculate stats
        const detectedCount = detections.length;
        const confidenceAvg = detectedCount > 0
            ? detections.reduce((sum, d) => sum + d.confidence, 0) / detectedCount
            : 0;

        return {
            detections,
            stats: {
                detectedCount,
                confidenceAvg: parseFloat(confidenceAvg.toFixed(2))
            }
        };

    } catch (error) {
        console.error('PII Detection failed:', error);
        await worker.terminate();
        throw error;
    }
}
