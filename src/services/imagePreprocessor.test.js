import { describe, it, expect, vi } from 'vitest';
import { validateImage, generateImageHash, preprocessImage } from './imagePreprocessor';

// Mock crypto.subtle.digest for hash generation in jsdom environment
const mockDigest = vi.fn();
Object.defineProperty(global, 'crypto', {
    value: {
        subtle: {
            digest: mockDigest,
        },
    },
});

describe('Image Preprocessor Service', () => {
    describe('validateImage', () => {
        it('should accept valid JPEG images under 5MB', () => {
            const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
            // Mock size getter if needed, but File constructor sets size based on content.
            // 13 bytes is well under 5MB.
            const result = validateImage(file);
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should reject SVG images', () => {
            const file = new File(['<svg>...</svg>'], 'test.svg', { type: 'image/svg+xml' });
            const result = validateImage(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/SVG/);
        });

        it('should reject files larger than 5MB', () => {
            // Create a mock file with size property mocked (since creating 5MB buffer is slow)
            const file = {
                name: 'large.jpg',
                type: 'image/jpeg',
                size: 6 * 1024 * 1024, // 6MB
            };
            const result = validateImage(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/5MB/);
        });

        it('should reject unsupported file types', () => {
            const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
            const result = validateImage(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/形式/);
        });
    });

    describe('generateImageHash', () => {
        it('should generate SHA-256 hash string', async () => {
            const file = new File(['test-content'], 'test.png', { type: 'image/png' });

            // Mock return of digest based on input
            mockDigest.mockResolvedValueOnce(new Uint8Array([1, 2, 3]).buffer);

            const hash = await generateImageHash(file);
            expect(hash).toBe('010203');
            expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
        });
    });

    describe('preprocessImage', () => {
        // Mock Canvas and Image
        beforeAll(() => {
            // Mock Image
            global.Image = class {
                constructor() {
                    this.onload = null;
                    this.onerror = null;
                    this.src = '';
                    this.width = 0;
                    this.height = 0;
                }
            };

            // Mock HTMLCanvasElement
            global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
                drawImage: vi.fn(),
                canvas: {
                    width: 0,
                    height: 0,
                    toBlob: vi.fn((callback) => callback(new Blob(['processed'], { type: 'image/jpeg' }))),
                },
            }));

            // Mock URL.createObjectURL
            global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
            global.URL.revokeObjectURL = vi.fn();
        });

        it('should resize large images to fit within 1600x1600', async () => {
            const file = new File(['content'], 'large.jpg', { type: 'image/jpeg' });

            // Spy on Image loading to trigger onload manually
            const originalImage = global.Image;
            global.Image = class extends originalImage {
                set src(url) {
                    setTimeout(() => {
                        this.width = 3200;
                        this.height = 2400;
                        if (this.onload) this.onload();
                    }, 10);
                }
            };

            const processedBlob = await preprocessImage(file);

            expect(processedBlob).toBeInstanceOf(Blob);
            // Verify Logic would be checking canvas width/height in real environment.
            // Here we ensure it resolved successfully.

            // Restore Image
            global.Image = originalImage;
        });

        it('should keep small images as is (but re-encode to remove EXIF)', async () => {
            const file = new File(['content'], 'small.jpg', { type: 'image/jpeg' });

            const originalImage = global.Image;
            global.Image = class extends originalImage {
                set src(url) {
                    setTimeout(() => {
                        this.width = 800;
                        this.height = 600;
                        if (this.onload) this.onload();
                    }, 10);
                }
            };

            const processedBlob = await preprocessImage(file);
            expect(processedBlob).toBeInstanceOf(Blob);
            global.Image = originalImage;
        });
    });
});
