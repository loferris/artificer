/**
 * Image Metadata Extraction Service
 * Extracts technical metadata from images without OCR
 */

import sharp from 'sharp';
import type { ImageMetadata } from '../types/pdf';

export class ImageExtractor {
  /**
   * Extract metadata from image buffer
   * Supports: JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF
   */
  async extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if image format is supported
   */
  isSupportedFormat(contentType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/tiff',
      'image/avif',
    ];

    return supportedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Validate image buffer
   * Returns true if buffer contains a valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const image = sharp(buffer);
      await image.metadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate thumbnail from image
   * Useful for preview generation
   */
  async generateThumbnail(
    buffer: Buffer,
    options: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
  ): Promise<Buffer> {
    const { width = 200, height = 200, fit = 'cover' } = options;

    try {
      return await sharp(buffer).resize(width, height, { fit }).toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize image (compress while maintaining quality)
   */
  async optimizeImage(
    buffer: Buffer,
    contentType: string,
    quality = 85
  ): Promise<Buffer> {
    try {
      const image = sharp(buffer);

      switch (contentType) {
        case 'image/jpeg':
        case 'image/jpg':
          return await image.jpeg({ quality, mozjpeg: true }).toBuffer();
        case 'image/png':
          return await image.png({ quality, compressionLevel: 9 }).toBuffer();
        case 'image/webp':
          return await image.webp({ quality }).toBuffer();
        default:
          // Return original for unsupported optimization
          return buffer;
      }
    } catch (error) {
      throw new Error(
        `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert image to different format
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif'
  ): Promise<Buffer> {
    try {
      const image = sharp(buffer);

      switch (targetFormat) {
        case 'jpeg':
          return await image.jpeg().toBuffer();
        case 'png':
          return await image.png().toBuffer();
        case 'webp':
          return await image.webp().toBuffer();
        case 'avif':
          return await image.avif().toBuffer();
        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to convert image format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
