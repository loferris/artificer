/**
 * Image Utilities Service
 * Provides image manipulation using sharp (TypeScript fallback for Python Pillow)
 *
 * Features:
 * - Image resizing with aspect ratio preservation
 * - Format conversion (PNG, JPEG, WebP, etc.)
 * - Quality optimization
 * - Metadata extraction
 */

import sharp from 'sharp';
import { logger } from '../../utils/logger';

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  preserveAspectRatio?: boolean;
}

export interface ImageConvertOptions {
  format?: 'png' | 'jpeg' | 'webp' | 'tiff' | 'gif';
  quality?: number; // 1-100
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  colorSpace?: string;
}

export class ImageUtils {
  /**
   * Get image metadata without loading the full image
   */
  static async getInfo(buffer: Buffer): Promise<ImageInfo> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        colorSpace: metadata.space,
      };
    } catch (error) {
      logger.error('Failed to get image info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: buffer.length,
      });
      throw new Error(
        `Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resize image with optional aspect ratio preservation
   * Matches Python Pillow's resize functionality
   */
  static async resize(buffer: Buffer, options: ImageResizeOptions): Promise<Buffer> {
    try {
      const startTime = Date.now();
      let image = sharp(buffer);

      // Get original dimensions
      const metadata = await image.metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;

      logger.debug('Resizing image', {
        originalWidth,
        originalHeight,
        options,
      });

      // Calculate target dimensions
      let targetWidth = options.width;
      let targetHeight = options.height;

      if (options.maxWidth || options.maxHeight) {
        // Calculate dimensions that fit within max bounds
        const maxW = options.maxWidth || originalWidth;
        const maxH = options.maxHeight || originalHeight;

        const widthRatio = maxW / originalWidth;
        const heightRatio = maxH / originalHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        targetWidth = Math.round(originalWidth * ratio);
        targetHeight = Math.round(originalHeight * ratio);
      }

      // Apply resize
      const fit = options.fit || 'inside';
      image = image.resize({
        width: targetWidth,
        height: targetHeight,
        fit: fit,
        withoutEnlargement: true,
      });

      const result = await image.toBuffer();
      const processingTime = Date.now() - startTime;

      logger.debug('Image resize completed', {
        originalSize: buffer.length,
        newSize: result.length,
        processingTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to resize image', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      });
      throw new Error(
        `Failed to resize image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert image to different format with optional quality settings
   * Matches Python Pillow's convert and save functionality
   */
  static async convert(buffer: Buffer, options: ImageConvertOptions = {}): Promise<Buffer> {
    try {
      const startTime = Date.now();
      const format = options.format || 'png';
      const quality = options.quality || 90;

      let image = sharp(buffer);

      // Resize if max dimensions specified
      if (options.maxWidth || options.maxHeight) {
        image = image.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to target format with quality settings
      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          image = image.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
        case 'tiff':
          image = image.tiff({ quality });
          break;
        case 'gif':
          image = image.gif();
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const result = await image.toBuffer();
      const processingTime = Date.now() - startTime;

      logger.debug('Image conversion completed', {
        format,
        quality,
        originalSize: buffer.length,
        newSize: result.length,
        compressionRatio: (buffer.length / result.length).toFixed(2),
        processingTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to convert image', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      });
      throw new Error(
        `Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize image file size while maintaining quality
   */
  static async optimize(buffer: Buffer, targetQuality: number = 85): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer).metadata();
      const format = metadata.format as 'png' | 'jpeg' | 'webp' | undefined;

      if (!format) {
        throw new Error('Unknown image format');
      }

      return await this.convert(buffer, {
        format,
        quality: targetQuality,
      });
    } catch (error) {
      logger.error('Failed to optimize image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Crop image to specified dimensions
   */
  static async crop(
    buffer: Buffer,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const result = await sharp(buffer)
        .extract({ left, top, width, height })
        .toBuffer();

      logger.debug('Image crop completed', {
        left,
        top,
        width,
        height,
      });

      return result;
    } catch (error) {
      logger.error('Failed to crop image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert PDF page to image using sharp's PDF support
   * Note: sharp has limited PDF support, pdf2pic is better for multi-page PDFs
   */
  static async pdfPageToImage(
    pdfBuffer: Buffer,
    options: { dpi?: number; format?: 'png' | 'jpeg' } = {}
  ): Promise<Buffer> {
    try {
      const format = options.format || 'png';
      const dpi = options.dpi || 200;

      // Sharp can only extract the first page of PDFs
      let image = sharp(pdfBuffer, {
        density: dpi,
      });

      if (format === 'jpeg') {
        image = image.jpeg({ quality: 90 });
      } else {
        image = image.png();
      }

      return await image.toBuffer();
    } catch (error) {
      logger.error('Failed to convert PDF page to image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to convert PDF page to image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply rotation to image
   */
  static async rotate(buffer: Buffer, degrees: number): Promise<Buffer> {
    try {
      const result = await sharp(buffer).rotate(degrees).toBuffer();

      logger.debug('Image rotation completed', {
        degrees,
      });

      return result;
    } catch (error) {
      logger.error('Failed to rotate image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to rotate image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Flip image horizontally or vertically
   */
  static async flip(buffer: Buffer, direction: 'horizontal' | 'vertical'): Promise<Buffer> {
    try {
      let image = sharp(buffer);

      if (direction === 'horizontal') {
        image = image.flop();
      } else {
        image = image.flip();
      }

      const result = await image.toBuffer();

      logger.debug('Image flip completed', {
        direction,
      });

      return result;
    } catch (error) {
      logger.error('Failed to flip image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to flip image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert image to grayscale
   */
  static async grayscale(buffer: Buffer): Promise<Buffer> {
    try {
      const result = await sharp(buffer).grayscale().toBuffer();

      logger.debug('Image grayscale conversion completed');

      return result;
    } catch (error) {
      logger.error('Failed to convert image to grayscale', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to convert to grayscale: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply blur to image
   */
  static async blur(buffer: Buffer, sigma: number = 3): Promise<Buffer> {
    try {
      const result = await sharp(buffer).blur(sigma).toBuffer();

      logger.debug('Image blur applied', { sigma });

      return result;
    } catch (error) {
      logger.error('Failed to blur image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to blur image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sharpen image
   */
  static async sharpen(buffer: Buffer, sigma: number = 1): Promise<Buffer> {
    try {
      const result = await sharp(buffer).sharpen(sigma).toBuffer();

      logger.debug('Image sharpen applied', { sigma });

      return result;
    } catch (error) {
      logger.error('Failed to sharpen image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to sharpen image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
