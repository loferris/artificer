/**
 * Utilities for working with Portable Text
 */

import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';
import type { DocumentMetadata } from '../types/index.js';

/**
 * Create a standard text block
 */
export function createTextBlock(
  text: string,
  style: 'normal' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' = 'normal',
  marks: string[] = []
): PortableTextBlock {
  return {
    _type: 'block',
    _key: generateKey(),
    style,
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text,
        marks,
      },
    ],
    markDefs: [],
  };
}

/**
 * Create a text span
 */
export function createSpan(
  text: string,
  marks: string[] = []
): PortableTextSpan {
  return {
    _type: 'span',
    _key: generateKey(),
    text,
    marks,
  };
}

/**
 * Create a code block
 */
export function createCodeBlock(
  code: string,
  language?: string,
  filename?: string
): any {
  return {
    _type: 'code',
    _key: generateKey(),
    language,
    code,
    filename,
  };
}

/**
 * Create an image block
 */
export function createImageBlock(
  url: string,
  alt?: string,
  caption?: string
): any {
  return {
    _type: 'image',
    _key: generateKey(),
    url,
    alt,
    caption,
  };
}

/**
 * Create a list item block
 */
export function createListItem(
  text: string,
  level: number = 1,
  listItem: 'bullet' | 'number' = 'bullet'
): PortableTextBlock {
  return {
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    listItem,
    level,
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text,
        marks: [],
      },
    ],
    markDefs: [],
  };
}

/**
 * Create a table block
 */
export function createTableBlock(
  rows: { cells: string[]; header?: boolean }[]
): any {
  return {
    _type: 'table',
    _key: generateKey(),
    rows,
  };
}

/**
 * Create a callout/admonition block
 */
export function createCalloutBlock(
  text: string,
  type: 'info' | 'warning' | 'error' | 'success' | 'note' = 'info'
): any {
  return {
    _type: 'callout',
    _key: generateKey(),
    calloutType: type,
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text,
        marks: [],
      },
    ],
  };
}

/**
 * Generate a unique key for Portable Text elements
 */
export function generateKey(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Merge consecutive text blocks with the same style
 */
export function mergeTextBlocks(
  blocks: any[]
): any[] {
  const merged: any[] = [];
  let current: any | null = null;

  for (const block of blocks) {
    if (
      block._type === 'block' &&
      current &&
      current._type === 'block' &&
      current.style === block.style &&
      !current.listItem &&
      !block.listItem
    ) {
      // Merge children
      current.children = [...current.children, ...block.children];
    } else {
      if (current) {
        merged.push(current);
      }
      current = block;
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

/**
 * Extract plain text from Portable Text blocks
 */
export function extractPlainText(blocks: any[]): string {
  return blocks
    .map((block) => {
      if (block._type === 'block' && 'children' in block) {
        return block.children
          .map((child: any) => {
            if ('text' in child) {
              return child.text;
            }
            return '';
          })
          .join('');
      } else if (block._type === 'code' && 'code' in block) {
        return block.code;
      }
      return '';
    })
    .join('\n');
}

/**
 * Create default metadata
 */
export function createMetadata(
  overrides: Partial<DocumentMetadata> = {}
): DocumentMetadata {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}

/**
 * Sanitize text for use in Portable Text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n');
}

/**
 * Split text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
