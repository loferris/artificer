/**
 * PDF Service
 * Orchestrates PDF processing including text extraction and OCR
 * Uses library extractors and app-specific OCR service
 */

import { PdfExtractor, type PdfExtractionResult } from '@artificer/document-converter';
import { OCRService } from '../image/OCRService';
import { pythonOCRClient } from '../python/PythonOCRClient';
import { logger } from '../../utils/logger';

export interface PdfProcessingResult {
  text: string;
  metadata: {
    pages: number;
    method: 'direct' | 'ocr' | 'hybrid';
    title?: string;
    author?: string;
    creationDate?: Date;
    hasTextContent: boolean;
    ocrUsed: boolean;
    ocrConfidence?: number;
    ocrCost?: number;
    processingTime: number;
  };
}

export class PdfService {
  private pdfExtractor: PdfExtractor;
  private ocrService?: OCRService;

  constructor(ocrService?: OCRService) {
    this.pdfExtractor = new PdfExtractor();
    this.ocrService = ocrService;
  }

  /**
   * Process PDF document with smart extraction
   * Tries direct extraction first, falls back to OCR if needed
   */
  async processPdf(
    buffer: Buffer,
    options: {
      forceOCR?: boolean; // Force OCR even if text is extractable
      minTextThreshold?: number; // Minimum chars to skip OCR
    } = {}
  ): Promise<PdfProcessingResult> {
    const startTime = Date.now();
    const { forceOCR = false, minTextThreshold = 100 } = options;

    logger.info('Processing PDF', {
      size: buffer.length,
      forceOCR,
      hasOCRService: !!this.ocrService,
      pythonServiceAvailable: pythonOCRClient.isAvailable(),
    });

    // Try Python service first (10-20x faster!)
    if (pythonOCRClient.isAvailable()) {
      try {
        logger.info('Using Python OCR service for PDF processing', {
          size: buffer.length,
          forceOCR,
        });

        const pythonResult = await pythonOCRClient.extractPdfText(buffer, {
          forceOCR,
          minTextThreshold,
        });

        return {
          text: pythonResult.text,
          metadata: {
            pages: pythonResult.metadata.pages,
            method: 'direct', // Python result
            title: pythonResult.metadata.title,
            author: pythonResult.metadata.author,
            creationDate: undefined, // Python doesn't parse dates yet
            hasTextContent: pythonResult.metadata.hasTextContent,
            ocrUsed: false,
            processingTime: pythonResult.metadata.processingTime,
          },
        };
      } catch (error) {
        const pythonStats = pythonOCRClient.getStats();
        logger.warn('Python service failed, falling back to TypeScript', {
          error: error instanceof Error ? error.message : 'Unknown error',
          pythonUrl: pythonStats.baseUrl,
          circuitState: pythonStats.circuitBreaker.state,
          pdfSize: buffer.length,
        });
        // Fall through to TypeScript implementation
      }
    } else {
      const pythonStats = pythonOCRClient.getStats();
      logger.debug('Python service not available, using TypeScript', {
        available: pythonStats.available,
        forceDisabled: pythonStats.forceDisabled,
        circuitState: pythonStats.circuitBreaker.state,
      });
    }

    try {
      // Fallback: TypeScript implementation
      logger.info('Using TypeScript PDF extraction (fallback)');
      // Step 1: Try direct text extraction
      const extraction = await this.pdfExtractor.extractText(buffer);

      let finalText = extraction.text;
      let method: 'direct' | 'ocr' | 'hybrid' = 'direct';
      let ocrUsed = false;
      let ocrConfidence: number | undefined;
      let ocrCost: number | undefined;

      // Step 2: Determine if OCR is needed
      const needsOCR =
        forceOCR ||
        this.pdfExtractor.needsOCR(extraction, minTextThreshold);

      if (needsOCR && this.ocrService && this.ocrService.isConfigured()) {
        logger.info('PDF needs OCR, attempting text extraction', {
          pages: extraction.pages,
          directTextLength: extraction.text.length,
        });

        try {
          const ocrResult = await this.ocrService.extractTextFromPdf(buffer);
          finalText = ocrResult.text;
          method = 'ocr';
          ocrUsed = true;
          ocrConfidence = ocrResult.confidence;
          ocrCost = ocrResult.metadata.cost;

          logger.info('OCR extraction successful', {
            textLength: finalText.length,
            confidence: ocrConfidence,
            cost: ocrCost,
          });
        } catch (error) {
          logger.warn('OCR extraction failed, using direct extraction', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Fall back to direct extraction
          finalText = extraction.text;
          method = 'direct';
        }
      } else if (needsOCR && !this.ocrService) {
        logger.warn('PDF needs OCR but OCR service not configured');
      }

      const processingTime = Date.now() - startTime;

      return {
        text: finalText,
        metadata: {
          pages: extraction.pages,
          method,
          title: extraction.metadata.title,
          author: extraction.metadata.author,
          creationDate: extraction.metadata.creationDate,
          hasTextContent: extraction.hasTextContent,
          ocrUsed,
          ocrConfidence,
          ocrCost,
          processingTime,
        },
      };
    } catch (error) {
      logger.error('PDF processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get PDF metadata without full text extraction
   * Fast operation for checking PDF properties
   */
  async getPdfMetadata(buffer: Buffer): Promise<{
    pages: number;
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  }> {
    try {
      return await this.pdfExtractor.getMetadata(buffer);
    } catch (error) {
      logger.error('Failed to get PDF metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if PDF needs OCR
   * Useful for UI to show OCR warning/cost estimate
   */
  async checkNeedsOCR(
    buffer: Buffer,
    minTextThreshold = 100
  ): Promise<{
    needsOCR: boolean;
    hasTextContent: boolean;
    pages: number;
    textLength: number;
    estimatedOCRCost?: number;
  }> {
    const extraction = await this.pdfExtractor.extractText(buffer);
    const needsOCR = this.pdfExtractor.needsOCR(extraction, minTextThreshold);

    // Rough cost estimate for OpenAI Vision OCR
    // Assuming ~1000 tokens per page with gpt-4o-mini
    const estimatedTokensPerPage = 1000;
    const costPer1MTokens = 0.15; // gpt-4o-mini input
    const estimatedOCRCost = needsOCR
      ? (extraction.pages * estimatedTokensPerPage * costPer1MTokens) / 1_000_000
      : undefined;

    return {
      needsOCR,
      hasTextContent: extraction.hasTextContent,
      pages: extraction.pages,
      textLength: extraction.text.length,
      estimatedOCRCost,
    };
  }

}
