/**
 * PDF-specific types and interfaces
 */

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PdfExtractionResult {
  text: string;
  pages: number;
  hasTextContent: boolean;
  metadata: PdfMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  space?: string; // Color space
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
  size: number; // File size in bytes
}

/**
 * OCR Provider Interface
 * Implementations should be provided by the consuming application
 */
export interface OCRProvider {
  extractText(buffer: Buffer, contentType: string): Promise<OCRResult>;
  extractTextFromPdf?(buffer: Buffer): Promise<OCRResult>;
}

export interface OCRResult {
  text: string;
  confidence: number; // 0.0 - 1.0
  language?: string;
  metadata: {
    processingTime: number; // milliseconds
    provider: string;
    pageCount?: number;
    [key: string]: any;
  };
}

export interface PdfImportOptions {
  /**
   * Optional OCR provider for scanned PDFs
   * If provided, will be used when PDF has no extractable text
   */
  ocrProvider?: OCRProvider;

  /**
   * Whether to attempt OCR on PDFs with little text
   * Default: true
   */
  attemptOCR?: boolean;

  /**
   * Minimum characters required to skip OCR
   * Default: 100
   */
  minTextThreshold?: number;
}
