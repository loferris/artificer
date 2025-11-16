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
 * Document metadata (format-agnostic)
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

/**
 * Generic converted document (format-agnostic)
 * The content type depends on the FormatAdapter being used
 */
export interface ConvertedDocument<T = any> {
  content: T[];
  metadata: DocumentMetadata;
  sourceMap?: SourceMap;
}

/**
 * Portable Text specific document (for backward compatibility)
 * @deprecated Use ConvertedDocument<PortableTextBlock> instead
 */
export interface PortableTextDocument extends ConvertedDocument<
  | PortableTextBlock
  | CodeBlock
  | ImageBlock
  | CalloutBlock
  | EmbedBlock
  | TableBlock
  | FileBlock
  | VideoBlock
  | AudioBlock
  | ColumnListBlock
  | ChildPageBlock
  | TableOfContentsBlock
  | LinkPreviewBlock
> {
  content: (
    | PortableTextBlock
    | CodeBlock
    | ImageBlock
    | CalloutBlock
    | EmbedBlock
    | TableBlock
    | FileBlock
    | VideoBlock
    | AudioBlock
    | ColumnListBlock
    | ChildPageBlock
    | TableOfContentsBlock
    | LinkPreviewBlock
  )[];
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

export interface BlockReferenceMark extends PortableTextMarkDefinition {
  _type: 'blockReference';
  blockUid: string;
}

export interface AttributeMark extends PortableTextMarkDefinition {
  _type: 'attribute';
  name: string;
  value: string;
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
  markDefs?: PortableTextMarkDefinition[];
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

export interface FileBlock {
  _type: 'file';
  _key: string;
  url: string;
  name?: string;
  type?: string; // 'file' | 'pdf'
  caption?: string;
}

export interface VideoBlock {
  _type: 'video';
  _key: string;
  url: string;
  caption?: string;
  provider?: 'external' | 'file';
}

export interface AudioBlock {
  _type: 'audio';
  _key: string;
  url: string;
  caption?: string;
}

export interface ColumnListBlock {
  _type: 'columnList';
  _key: string;
  columns: ColumnBlock[];
}

export interface ColumnBlock {
  _type: 'column';
  _key: string;
  children: PortableTextBlock[];
}

export interface ChildPageBlock {
  _type: 'childPage';
  _key: string;
  title: string;
  pageId?: string;
}

export interface TableOfContentsBlock {
  _type: 'tableOfContents';
  _key: string;
  color?: string;
}

export interface LinkPreviewBlock {
  _type: 'linkPreview';
  _key: string;
  url: string;
}

/**
 * Source map for tracing blocks back to original document
 */
export interface SourceMapEntry {
  /** Block key in the converted document */
  blockKey: string;

  /** Original line number (1-indexed) */
  line?: number;

  /** Original column number (0-indexed) */
  column?: number;

  /** Length in the original document */
  length?: number;

  /** Original source identifier (filename, URL, etc.) */
  source?: string;

  /** Original block type before conversion */
  originalType?: string;

  /** Additional metadata */
  [key: string]: unknown;
}

export interface SourceMap {
  /** Version of source map format */
  version: number;

  /** Array of source map entries */
  mappings: SourceMapEntry[];

  /** Source files referenced */
  sources?: string[];

  /** Original source content (optional) */
  sourcesContent?: string[];
}

/**
 * Import/Export Options
 */
export interface ImportOptions {
  preserveUnknownBlocks?: boolean;
  preserveMetadata?: boolean;

  /**
   * Include source map for tracing blocks to original document
   * Default: false
   */
  includeSourceMap?: boolean;

  /**
   * Strict mode - if false, continues processing on errors
   * Default: true (throws on first error)
   */
  strictMode?: boolean;

  /**
   * Error handler callback - called for each error encountered
   * Only used when strictMode is false
   */
  onError?: (error: Error, context?: { blockIndex?: number; block?: any }) => void;
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
  'view-type'?: string; // 'document', 'numbered', 'bullet'
  open?: boolean; // Collapsed state
  refs?: Array<{ uid: string }>; // Page references
  props?: Record<string, any>; // Block properties/attributes
  [key: string]: unknown;
}

export interface RoamPage {
  title: string;
  children?: RoamBlock[];
  'create-time'?: number;
  'edit-time'?: number;
  'log-id'?: string;
  refs?: Array<{ uid: string }>; // Page references
  attrs?: Record<string, any>; // Page attributes
  [key: string]: unknown;
}

/**
 * Converter plugin interfaces (now format-agnostic)
 */
export interface ImporterPlugin<T = any> {
  name: string;
  supportedFormats: string[];
  detect(input: string | Buffer): boolean;
  import(input: string, options?: ImportOptions): Promise<ConvertedDocument<T>>;
}

export interface ExporterPlugin<T = any> {
  name: string;
  targetFormat: string;
  export(
    document: ConvertedDocument<T>,
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
