/**
 * Format adapter interface - abstracts the intermediate document format
 * This allows swapping between Portable Text, ProseMirror, Slate, or custom formats
 */

import type { DocumentMetadata } from '../types/index.js';

/**
 * Intermediate document representation (format-agnostic)
 */
export interface IntermediateDocument {
  content: any[]; // Array of blocks in the chosen format
  metadata: DocumentMetadata;
}

/**
 * Block styles supported across formats
 */
export type BlockStyle =
  | 'normal'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'blockquote';

/**
 * List types supported across formats
 */
export type ListType = 'bullet' | 'number';

/**
 * Text marks/formatting supported across formats
 */
export type TextMark =
  | 'strong'
  | 'em'
  | 'code'
  | 'strike'
  | 'underline'
  | 'highlight';

/**
 * Callout/admonition types
 */
export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note';

/**
 * Link definition
 */
export interface LinkDef {
  href: string;
  title?: string;
}

/**
 * Wiki link definition
 */
export interface WikiLinkDef {
  target: string;
  alias?: string;
}

/**
 * Format adapter interface
 * Implement this to support a new intermediate format
 */
export interface FormatAdapter {
  /**
   * Adapter name/identifier
   */
  readonly name: string;

  /**
   * Create a text block (paragraph or heading)
   */
  createTextBlock(
    children: any[],
    options?: {
      style?: BlockStyle;
      listItem?: ListType;
      level?: number;
      marks?: any[];
    }
  ): any;

  /**
   * Create a text span with optional marks
   */
  createSpan(text: string, marks?: string[]): any;

  /**
   * Create a code block
   */
  createCodeBlock(code: string, language?: string, filename?: string): any;

  /**
   * Create an image block
   */
  createImageBlock(url: string, alt?: string, caption?: string): any;

  /**
   * Create a table block
   */
  createTableBlock(rows: { cells: string[]; header?: boolean }[]): any;

  /**
   * Create a callout/admonition block
   */
  createCalloutBlock(children: any[], type: CalloutType): any;

  /**
   * Create a link mark definition
   */
  createLinkMark(href: string, title?: string): { key: string; def: any };

  /**
   * Create a wiki link mark definition
   */
  createWikiLinkMark(target: string, alias?: string): { key: string; def: any };

  /**
   * Generate a unique key/ID for blocks
   */
  generateKey(): string;

  /**
   * Extract plain text from blocks
   */
  extractPlainText(blocks: any[]): string;

  /**
   * Get block type
   */
  getBlockType(block: any): string;

  /**
   * Check if block has children
   */
  hasChildren(block: any): boolean;

  /**
   * Get block children
   */
  getChildren(block: any): any[];

  /**
   * Get text from span
   */
  getSpanText(span: any): string;

  /**
   * Get marks from span
   */
  getSpanMarks(span: any): string[];

  /**
   * Get block style
   */
  getBlockStyle(block: any): BlockStyle | undefined;

  /**
   * Get list type from block
   */
  getListType(block: any): ListType | undefined;

  /**
   * Get list level from block
   */
  getListLevel(block: any): number | undefined;

  /**
   * Get mark definitions from block
   */
  getMarkDefs(block: any): any[];

  /**
   * Get code from code block
   */
  getCode(block: any): string | undefined;

  /**
   * Get language from code block
   */
  getLanguage(block: any): string | undefined;

  /**
   * Get URL from image block
   */
  getImageUrl(block: any): string | undefined;

  /**
   * Get alt text from image block
   */
  getImageAlt(block: any): string | undefined;

  /**
   * Get table rows
   */
  getTableRows(block: any): { cells: string[]; header?: boolean }[] | undefined;

  /**
   * Get callout type
   */
  getCalloutType(block: any): CalloutType | undefined;
}

/**
 * Base adapter with common utilities
 */
export abstract class BaseFormatAdapter implements FormatAdapter {
  abstract readonly name: string;
  abstract createTextBlock(children: any[], options?: any): any;
  abstract createSpan(text: string, marks?: string[]): any;
  abstract createCodeBlock(code: string, language?: string, filename?: string): any;
  abstract createImageBlock(url: string, alt?: string, caption?: string): any;
  abstract createTableBlock(rows: { cells: string[]; header?: boolean }[]): any;
  abstract createCalloutBlock(children: any[], type: CalloutType): any;
  abstract createLinkMark(href: string, title?: string): { key: string; def: any };
  abstract createWikiLinkMark(target: string, alias?: string): { key: string; def: any };
  abstract extractPlainText(blocks: any[]): string;
  abstract getBlockType(block: any): string;
  abstract hasChildren(block: any): boolean;
  abstract getChildren(block: any): any[];
  abstract getSpanText(span: any): string;
  abstract getSpanMarks(span: any): string[];
  abstract getBlockStyle(block: any): BlockStyle | undefined;
  abstract getListType(block: any): ListType | undefined;
  abstract getListLevel(block: any): number | undefined;
  abstract getMarkDefs(block: any): any[];
  abstract getCode(block: any): string | undefined;
  abstract getLanguage(block: any): string | undefined;
  abstract getImageUrl(block: any): string | undefined;
  abstract getImageAlt(block: any): string | undefined;
  abstract getTableRows(block: any): { cells: string[]; header?: boolean }[] | undefined;
  abstract getCalloutType(block: any): CalloutType | undefined;

  /**
   * Default key generation using crypto.randomUUID()
   * Generates RFC 4122 version 4 UUIDs for guaranteed uniqueness
   */
  generateKey(): string {
    // Use Node.js crypto.randomUUID() for proper UUID v4 generation
    // Falls back to random string if crypto is not available (browser environments)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for older Node.js versions or browsers without crypto.randomUUID
    // This is a simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sanitize text (common utility)
   */
  sanitizeText(text: string): string {
    return text
      .replace(/\u0000/g, '') // Remove null bytes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');
  }

  /**
   * Split text into paragraphs (common utility)
   */
  splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
