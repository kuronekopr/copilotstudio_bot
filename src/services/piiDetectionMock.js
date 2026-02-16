/**
 * Mock service to simulate PII detection.
 * In a real app, this would use Tesseract.js or a backend API.
 * 
 * @param {HTMLImageElement} imageElement 
 * @returns {Promise<Array<{x: number, y: number, w: number, h: number}>>}
 */
export const detectPII = async (imageElement) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Dummy logic: Return a few random "detected" areas relative to image size
    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;

    // Randomly generate 0-2 detected areas
    const count = Math.floor(Math.random() * 3);
    const detections = [];

    for (let i = 0; i < count; i++) {
        detections.push({
            x: Math.random() * (width * 0.8),
            y: Math.random() * (height * 0.8),
            w: width * 0.15, // 15% width
            h: height * 0.05  // 5% height
        });
    }

    return detections;
};
