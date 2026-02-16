// Use CDN-loaded Tesseract (window.Tesseract) instead of npm bundle
// Vite's bundling corrupts Tesseract.js structured output (blocks/lines/words return empty)

/**
 * Client-side PII detection using Tesseract.js (CDN Version)
 * Detects Email addresses and Japanese Phone numbers.
 * 
 * @param {HTMLImageElement} imageElement 
 * @returns {Promise<{detections: Array<{x: number, y: number, w: number, h: number}>, text: string, debug: string}>}
 */
export const detectPII = async (imageElement) => {
    const debugLog = [];

    // Use CDN-loaded Tesseract from window
    const Tesseract = window.Tesseract;
    if (!Tesseract) {
        throw new Error("Tesseract.js CDN not loaded. Check index.html.");
    }

    debugLog.push(`Start detectPII (CDN Tesseract v${Tesseract.version || '5.x'})`);

    // Regex for Phone
    const phoneRegex = /(0\d{1,4}.{0,3}\d{1,4}.{0,3}\d{4})|(\(0\d{1,4}\).{0,3}\d{1,4}.{0,3}\d{4})/;
    const simplePhone = /0\d{2,4}-\d{2,4}-\d{4}/;

    // Aggressive digit check
    const isAggressivePhone = (text) => {
        const digits = text.replace(/[^0-9]/g, '');
        return digits.length >= 10 && (digits.startsWith('0') || digits.length >= 11);
    };

    try {
        console.log("[PII] Running CDN Tesseract...");

        const result = await Tesseract.recognize(
            imageElement,
            'eng+jpn',
            { logger: m => console.log("[Tesseract]", m) }
        );

        const data = result.data;
        const lines = data.lines || [];

        debugLog.push(`Lines: ${lines.length}, Words: ${(data.words || []).length}`);

        const detections = [];
        const uniqueKeys = new Set();

        const addDetection = (bbox, type, text) => {
            if (!bbox || typeof bbox.x0 !== 'number') return;

            const x = bbox.x0;
            const y = bbox.y0;
            const w = bbox.x1 - bbox.x0;
            const h = bbox.y1 - bbox.y0;

            const key = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;
            if (!uniqueKeys.has(key)) {
                debugLog.push(`[MATCH] ${type}: (${x},${y},${w},${h}) "${text.substring(0, 30)}"`);
                detections.push({ x, y, w, h });
                uniqueKeys.add(key);
            }
        };

        // Regex for Romaji Name: 2+ capitalized words (e.g. "Minagawa Masayuki")
        const romajiNameRegex = /^[A-Z][a-z]{1,}(\s+[A-Z][a-z]{1,})+$/;
        // Common UI labels to exclude from name detection
        const uiLabels = new Set([
            'United States', 'Google Play', 'App Store', 'Sign In', 'Log In',
            'Sign Out', 'Log Out', 'Read More', 'Learn More', 'Click Here',
        ]);

        const isRomajiName = (text) => {
            const trimmed = text.trim();
            if (!romajiNameRegex.test(trimmed)) return false;
            if (uiLabels.has(trimmed)) return false;
            // Must be a reasonable name length (2-4 words, each 2+ chars)
            const words = trimmed.split(/\s+/);
            return words.length >= 2 && words.length <= 4 && words.every(w => w.length >= 2);
        };

        // Process Lines - CDN version confirmed to return lines correctly
        lines.forEach(line => {
            const text = line.text.trim();

            if (phoneRegex.test(text) || simplePhone.test(text) || isAggressivePhone(text)) {
                addDetection(line.bbox, "Phone", text);
            } else if (text.includes('@') && text.includes('.')) {
                addDetection(line.bbox, "Email", text);
            } else if (isRomajiName(text)) {
                addDetection(line.bbox, "Name", text);
            }
        });

        debugLog.push(`Total Detections: ${detections.length}`);
        const debugString = debugLog.join('\n');
        console.log("--- PII DEBUG LOG ---\n", debugString);

        return { detections, text: data.text, debug: debugString };

    } catch (error) {
        console.error("Tesseract detection failed:", error);
        throw error;
    }
};
