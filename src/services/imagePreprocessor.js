/**
 * Image Preprocessing Service
 * Handles validation, resizing, EXIF removal, and hash generation.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validate image file.
 * @param {File} file 
 * @returns {object} { valid: boolean, error: string | null }
 */
export function validateImage(file) {
    if (!file) {
        return { valid: false, error: 'ファイルが選択されていません。' };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        if (file.type === 'image/svg+xml') {
            return { valid: false, error: 'SVG形式はセキュリティリスクのためサポートされていません。' };
        }
        return { valid: false, error: 'サポートされていないファイル形式です (JPEG, PNG, WebPのみ)。' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'ファイルサイズが大きすぎます (最大5MB)。' };
    }

    return { valid: true, error: null };
}

/**
 * Generate SHA-256 hash of the image file.
 * @param {File} file 
 * @returns {Promise<string>} Hex string of hash
 */
export async function generateImageHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Preprocess image: Remove EXIF, Resize to max 1600x1600.
 * @param {File} file 
 * @returns {Promise<Blob>} Processed image blob
 */
export async function preprocessImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1600;

            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height = Math.round((height * MAX_SIZE) / width);
                    width = MAX_SIZE;
                } else {
                    width = Math.round((width * MAX_SIZE) / height);
                    height = MAX_SIZE;
                }
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            // Draw image (removes EXIF)
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white'; // Fill transparent background for PNG->JPEG conversion
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG with 80% quality
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to Blob conversion failed'));
                }
            }, 'image/jpeg', 0.8);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
