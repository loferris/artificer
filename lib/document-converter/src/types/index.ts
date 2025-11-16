/**
 * Core type definitions for the document converter library
 */

import type {
  PortableTextBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';

export type { ArbitraryTypedObject } from '@portabletext/types';

/**
 * Extended Portable Text types with custom marks and blocks
 */

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  source?: 'obsidian' | 'notion' | 'roam' | 'markdown' | 'json' | string;
  sourceId?: string;
  [key: string]: unknown;
}

export interface ConvertedDocument {
  content: (PortableTextBlock | CodeBlock | ImageBlock | CalloutBlock | EmbedBlock | TableBlock)[];
  metadata: DocumentMetadata;
}

/**
 * Custom mark types for extended formatting
 */
export interface HighlightMark extends PortableTextMarkDefinition {
  _type: 'highlight';
  color?: string;
}

export interface LinkMark extends PortableTextMarkDefinition {
  _type: 'link';
  href: string;
  title?: string;
}

export interface WikiLinkMark extends PortableTextMarkDefinition {
  _type: 'wikiLink';
  target: string;
  alias?: string;
}

/**
 * Custom block types
 */
export interface CodeBlock {
  _type: 'code';
  _key: string;
  language?: string;
  code: string;
  filename?: string;
}

export interface ImageBlock {
  _type: 'image';
  _key: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface CalloutBlock {
  _type: 'callout';
  _key: string;
  calloutType: 'info' | 'warning' | 'error' | 'success' | 'note';
  children: PortableTextSpan[];
}

export interface EmbedBlock {
  _type: 'embed';
  _key: string;
  url: string;
  provider?: string;
  title?: string;
}

export interface TableBlock {
  _type: 'table';
  _key: string;
  rows: {
    cells: string[];
    header?: boolean;
  }[];
}

/**
 * Import/Export Options
 */
export interface ImportOptions {
  preserveUnknownBlocks?: boolean;
  preserveMetadata?: boolean;
  includeSourceMap?: boolean;
  strictMode?: boolean;
}

export interface ExportOptions {
  format?: 'markdown' | 'json';
  preserveCustomMarks?: boolean;
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

/**
 * Platform-specific types
 */

// Obsidian
export interface ObsidianFrontmatter {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

// Notion
export interface NotionBlock {
  object: 'block';
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface NotionPage {
  object: 'page';
  id: string;
  properties: Record<string, unknown>;
  children?: NotionBlock[];
}

// Roam
export interface RoamBlock {
  string?: string;
  children?: RoamBlock[];
  uid?: string;
  'create-time'?: number;
  'edit-time'?: number;
  heading?: number;
  'text-align'?: string;
  [key: string]: unknown;
}

export interface RoamPage {
  title: string;
  children?: RoamBlock[];
  'create-time'?: number;
  'edit-time'?: number;
  [key: string]: unknown;
}

/**
 * Converter plugin interfaces
 */
export interface ImporterPlugin {
  name: string;
  supportedFormats: string[];
  detect(input: string | Buffer): boolean;
  import(input: string, options?: ImportOptions): Promise<ConvertedDocument>;
}

export interface ExporterPlugin {
  name: string;
  targetFormat: string;
  export(
    document: ConvertedDocument,
    options?: ExportOptions
  ): Promise<string>;
}

/**
 * Error types
 */
export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}
