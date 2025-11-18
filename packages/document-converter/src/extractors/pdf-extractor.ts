/**
 * PDF Text Extraction Service
 * Handles direct text extraction from text-based PDFs
 */

import type { PdfExtractionResult, PdfMetadata } from '../types/pdf';

// Dynamic import for pdf-parse to handle ESM/CJS compatibility
type PdfParseResult = {
  numpages: number;
  info?: Record<string, any>;
  text: string;
};
type PdfParseFunction = (buffer: Buffer) => Promise<PdfParseResult>;

export class PdfExtractor {
  /**
   * Extract text directly from PDF without OCR
   * This works for PDFs created digitally with embedded text
   */
  async extractText(buffer: Buffer): Promise<PdfExtractionResult> {
    try {
      // Use dynamic import to handle ESM/CJS compatibility
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = ((pdfParseModule as any).default || pdfParseModule) as unknown as PdfParseFunction;
      const data = await pdfParse(buffer);

      // Parse metadata
      const metadata: PdfMetadata = {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: this.parseDate(data.info?.CreationDate),
        modificationDate: this.parseDate(data.info?.ModDate),
      };

      const text = data.text || '';
      const hasTextContent = text.trim().length > 100;

      return {
        text,
        pages: data.numpages || 0,
        hasTextContent,
        metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Determine if PDF needs OCR
   * Returns true if PDF appears to be scanned or has minimal text
   */
  needsOCR(extractionResult: PdfExtractionResult, minTextThreshold = 100): boolean {
    const textLength = extractionResult.text.trim().length;

    // If we have very little text relative to page count, likely scanned
    const avgTextPerPage = textLength / Math.max(extractionResult.pages, 1);

    return !extractionResult.hasTextContent || avgTextPerPage < minTextThreshold;
  }

  /**
   * Parse PDF date string to JavaScript Date
   * PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm'
   */
  private parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // Remove 'D:' prefix if present
      const cleaned = dateString.replace(/^D:/, '');

      // Extract components
      const year = parseInt(cleaned.substring(0, 4), 10);
      const month = parseInt(cleaned.substring(4, 6), 10) - 1; // Month is 0-indexed
      const day = parseInt(cleaned.substring(6, 8), 10);
      const hour = parseInt(cleaned.substring(8, 10), 10) || 0;
      const minute = parseInt(cleaned.substring(10, 12), 10) || 0;
      const second = parseInt(cleaned.substring(12, 14), 10) || 0;

      return new Date(year, month, day, hour, minute, second);
    } catch {
      return undefined;
    }
  }

  /**
   * Get basic PDF information without full text extraction
   * Useful for quick metadata checks
   */
  async getMetadata(buffer: Buffer): Promise<PdfMetadata & { pages: number }> {
    const result = await this.extractText(buffer);
    return {
      ...result.metadata,
      pages: result.pages,
    };
  }
}
