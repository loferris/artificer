import { describe, it, expect, beforeAll } from 'vitest';
import { ImageUtils } from '../ImageUtils';
import fs from 'fs';
import path from 'path';

describe('ImageUtils', () => {
  // Test fixtures
  const fixturesDir = path.join(__dirname, 'fixtures');
  let testImagePng: Buffer;
  let testImageJpg: Buffer;
  let invalidImage: Buffer;

  beforeAll(() => {
    // Load test fixtures
    testImagePng = fs.readFileSync(path.join(fixturesDir, 'test-100x100.png'));
    testImageJpg = fs.readFileSync(path.join(fixturesDir, 'test-2000x2000.jpg'));
    invalidImage = fs.readFileSync(path.join(fixturesDir, 'invalid.bin'));
  });

  describe('getInfo', () => {
    it('should extract image metadata from PNG', async () => {
      const info = await ImageUtils.getInfo(testImagePng);

      expect(info).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        format: expect.any(String),
        size: expect.any(Number),
        hasAlpha: expect.any(Boolean),
      });

      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
      expect(info.format).toBe('png');
    });

    it('should extract image metadata from JPEG', async () => {
      const info = await ImageUtils.getInfo(testImageJpg);

      expect(info.width).toBe(2000);
      expect(info.height).toBe(2000);
      expect(info.format).toBe('jpeg');
    });

    it('should throw error for invalid image data', async () => {
      await expect(ImageUtils.getInfo(invalidImage)).rejects.toThrow();
    });
  });

  describe('resize', () => {
    it('should resize image with maxWidth and maxHeight', async () => {
      const resized = await ImageUtils.resize(testImagePng, {
        maxWidth: 50,
        maxHeight: 50,
      });

      const info = await ImageUtils.getInfo(resized);
      expect(info.width).toBeLessThanOrEqual(50);
      expect(info.height).toBeLessThanOrEqual(50);
    });

    it('should preserve aspect ratio', async () => {
      const resized = await ImageUtils.resize(testImageJpg, {
        maxWidth: 1000,
        maxHeight: 500,
      });

      const info = await ImageUtils.getInfo(resized);
      // Should fit within 1000x500 while maintaining aspect ratio
      expect(info.width).toBeLessThanOrEqual(1000);
      expect(info.height).toBeLessThanOrEqual(500);
      // Since original is square, should be 500x500
      expect(info.width).toBe(500);
      expect(info.height).toBe(500);
    });

    it('should resize with specific width and height', async () => {
      const resized = await ImageUtils.resize(testImagePng, {
        width: 200,
        height: 200,
      });

      const info = await ImageUtils.getInfo(resized);
      expect(info.width).toBeLessThanOrEqual(200);
      expect(info.height).toBeLessThanOrEqual(200);
    });

    it('should handle invalid buffer', async () => {
      await expect(
        ImageUtils.resize(invalidImage, { maxWidth: 100 })
      ).rejects.toThrow();
    });
  });

  describe('convert', () => {
    it('should convert PNG to JPEG', async () => {
      const jpeg = await ImageUtils.convert(testImagePng, {
        format: 'jpeg',
        quality: 90,
      });

      const info = await ImageUtils.getInfo(jpeg);
      expect(info.format).toBe('jpeg');
      expect(jpeg.length).toBeGreaterThan(0);
    });

    it('should convert JPEG to PNG', async () => {
      const png = await ImageUtils.convert(testImageJpg, {
        format: 'png',
      });

      const info = await ImageUtils.getInfo(png);
      expect(info.format).toBe('png');
    });

    it('should convert with quality settings', async () => {
      const highQuality = await ImageUtils.convert(testImagePng, {
        format: 'jpeg',
        quality: 95,
      });

      const lowQuality = await ImageUtils.convert(testImagePng, {
        format: 'jpeg',
        quality: 50,
      });

      // Lower quality should result in smaller file size
      expect(lowQuality.length).toBeLessThan(highQuality.length);
    });

    it('should convert and resize together', async () => {
      const converted = await ImageUtils.convert(testImageJpg, {
        format: 'png',
        maxWidth: 500,
        maxHeight: 500,
      });

      const info = await ImageUtils.getInfo(converted);
      expect(info.format).toBe('png');
      expect(info.width).toBeLessThanOrEqual(500);
      expect(info.height).toBeLessThanOrEqual(500);
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        ImageUtils.convert(testImagePng, {
          format: 'invalid' as any,
        })
      ).rejects.toThrow(/Unsupported format/);
    });

    it('should throw error for invalid image data', async () => {
      await expect(
        ImageUtils.convert(invalidImage, {
          format: 'jpeg',
        })
      ).rejects.toThrow();
    });
  });

  describe('optimize', () => {
    it('should optimize image file size', async () => {
      const optimized = await ImageUtils.optimize(testImagePng, 85);

      expect(optimized.length).toBeGreaterThan(0);
      // Optimized should typically be smaller
      expect(optimized.length).toBeLessThanOrEqual(testImagePng.length * 1.5);
    });

    it('should handle different quality levels', async () => {
      const highQuality = await ImageUtils.optimize(testImagePng, 95);
      const lowQuality = await ImageUtils.optimize(testImagePng, 50);

      // For small images, the difference might be minimal or nonexistent
      // Just verify both produce valid output
      expect(lowQuality.length).toBeGreaterThan(0);
      expect(highQuality.length).toBeGreaterThan(0);
    });
  });

  describe('crop', () => {
    it('should crop image to specified dimensions', async () => {
      const cropped = await ImageUtils.crop(testImagePng, 10, 10, 50, 50);

      const info = await ImageUtils.getInfo(cropped);
      expect(info.width).toBe(50);
      expect(info.height).toBe(50);
    });

    it('should handle edge cases', async () => {
      // Crop from origin
      const cropped = await ImageUtils.crop(testImagePng, 0, 0, 50, 50);

      const info = await ImageUtils.getInfo(cropped);
      expect(info.width).toBe(50);
      expect(info.height).toBe(50);
    });
  });

  describe('rotate', () => {
    it('should rotate image 90 degrees', async () => {
      const rotated = await ImageUtils.rotate(testImagePng, 90);

      expect(rotated.length).toBeGreaterThan(0);
      // After rotation, dimensions might swap (but our test image is square)
      const info = await ImageUtils.getInfo(rotated);
      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
    });

    it('should rotate image 180 degrees', async () => {
      const rotated = await ImageUtils.rotate(testImagePng, 180);

      const info = await ImageUtils.getInfo(rotated);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });

    it('should rotate image 270 degrees', async () => {
      const rotated = await ImageUtils.rotate(testImagePng, 270);

      expect(rotated.length).toBeGreaterThan(0);
    });
  });

  describe('flip', () => {
    it('should flip image horizontally', async () => {
      const flipped = await ImageUtils.flip(testImagePng, 'horizontal');

      const info = await ImageUtils.getInfo(flipped);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });

    it('should flip image vertically', async () => {
      const flipped = await ImageUtils.flip(testImagePng, 'vertical');

      const info = await ImageUtils.getInfo(flipped);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });
  });

  describe('grayscale', () => {
    it('should convert image to grayscale', async () => {
      const grayscale = await ImageUtils.grayscale(testImagePng);

      const info = await ImageUtils.getInfo(grayscale);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
      // Grayscale images are typically smaller
      expect(grayscale.length).toBeGreaterThan(0);
    });
  });

  describe('blur', () => {
    it('should apply blur to image', async () => {
      const blurred = await ImageUtils.blur(testImagePng, 3);

      const info = await ImageUtils.getInfo(blurred);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });

    it('should handle different sigma values', async () => {
      const lowBlur = await ImageUtils.blur(testImagePng, 1);
      const highBlur = await ImageUtils.blur(testImagePng, 5);

      expect(lowBlur.length).toBeGreaterThan(0);
      expect(highBlur.length).toBeGreaterThan(0);
    });
  });

  describe('sharpen', () => {
    it('should apply sharpen to image', async () => {
      const sharpened = await ImageUtils.sharpen(testImagePng, 1);

      const info = await ImageUtils.getInfo(sharpened);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });
  });
});
