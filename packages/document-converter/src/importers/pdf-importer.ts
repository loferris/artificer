/**
 * PDF to Portable Text Importer
 * Converts PDF documents to Portable Text format
 */

import type { PortableTextBlock } from '@portabletext/types';
import { PdfExtractor } from '../extractors/pdf-extractor';
import type { PdfImportOptions, OCRResult } from '../types/pdf';

export class PdfImporter {
  private extractor: PdfExtractor;

  constructor() {
    this.extractor = new PdfExtractor();
  }

  /**
   * Import PDF to Portable Text
   * Attempts direct text extraction, falls back to OCR if needed
   */
  async import(
    buffer: Buffer,
    options: PdfImportOptions = {}
  ): Promise<PortableTextBlock[]> {
    const {
      ocrProvider,
      attemptOCR = true,
      minTextThreshold = 100,
    } = options;

    // Try direct text extraction first
    const extraction = await this.extractor.extractText(buffer);

    let textContent = extraction.text;
    let method: 'direct' | 'ocr' = 'direct';

    // Check if we need OCR
    if (
      attemptOCR &&
      ocrProvider &&
      this.extractor.needsOCR(extraction, minTextThreshold)
    ) {
      try {
        const ocrResult: OCRResult = await ocrProvider.extractTextFromPdf?.(buffer) ||
          await ocrProvider.extractText(buffer, 'application/pdf');

        textContent = ocrResult.text;
        method = 'ocr';
      } catch (error) {
        // OCR failed, fall back to whatever text we extracted
        console.warn('OCR extraction failed, using direct extraction:', error);
      }
    }

    // Convert to Portable Text
    return this.convertToPortableText(textContent, {
      pages: extraction.pages,
      method,
      metadata: extraction.metadata,
    });
  }

  /**
   * Convert plain text to Portable Text blocks
   * Splits by paragraphs and preserves structure
   */
  private convertToPortableText(
    text: string,
    context: {
      pages: number;
      method: 'direct' | 'ocr';
      metadata: any;
    }
  ): PortableTextBlock[] {
    const blocks: PortableTextBlock[] = [];

    // Add metadata block
    blocks.push({
      _type: 'block',
      _key: 'pdf-metadata',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 'metadata-span',
          text: `[PDF Document - ${context.pages} pages - Extracted via ${context.method}]`,
          marks: ['em'],
        },
      ],
    });

    // Split text into paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Convert each paragraph to a block
    paragraphs.forEach((paragraph, index) => {
      blocks.push({
        _type: 'block',
        _key: `pdf-para-${index}`,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: `pdf-span-${index}`,
            text: paragraph,
            marks: [],
          },
        ],
      });
    });

    return blocks;
  }

  /**
   * Import PDF and get metadata
   * Returns both content and metadata
   */
  async importWithMetadata(
    buffer: Buffer,
    options: PdfImportOptions = {}
  ): Promise<{
    blocks: PortableTextBlock[];
    metadata: {
      pages: number;
      extractionMethod: 'direct' | 'ocr';
      title?: string;
      author?: string;
      creationDate?: Date;
    };
  }> {
    const extraction = await this.extractor.extractText(buffer);
    const blocks = await this.import(buffer, options);

    return {
      blocks,
      metadata: {
        pages: extraction.pages,
        extractionMethod: this.extractor.needsOCR(extraction, options.minTextThreshold)
          ? 'ocr'
          : 'direct',
        title: extraction.metadata.title,
        author: extraction.metadata.author,
        creationDate: extraction.metadata.creationDate,
      },
    };
  }
}
