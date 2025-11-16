/**
 * Document Converter Library
 * A format-agnostic document conversion library with pluggable intermediate formats
 *
 * @example
 * ```typescript
 * import { DocumentConverter } from './document-converter';
 *
 * const converter = new DocumentConverter();
 *
 * // Import from Obsidian markdown
 * const doc = await converter.import(markdownContent);
 *
 * // Export to Notion JSON
 * const notionJson = await converter.export(doc, 'notion');
 * ```
 *
 * @example Custom adapter
 * ```typescript
 * import { DocumentConverter, FormatAdapter } from './document-converter';
 *
 * const converter = new DocumentConverter({
 *   adapter: myCustomAdapter
 * });
 * ```
 */

import { PluginRegistry } from './plugins/plugin-registry.js';
import { MarkdownImporter } from './importers/markdown-importer.js';
import { NotionImporter } from './importers/notion-importer.js';
import { RoamImporter } from './importers/roam-importer.js';
import { MarkdownExporter } from './exporters/markdown-exporter.js';
import { NotionExporter } from './exporters/notion-exporter.js';
import { RoamExporter } from './exporters/roam-exporter.js';
import { HtmlExporter } from './exporters/html-exporter.js';
import { portableTextAdapter } from './adapters/portable-text-adapter.js';
import { ConversionError } from './types/index.js';

import type {
  ConvertedDocument,
  ImportOptions,
  ExportOptions,
  ImporterPlugin,
  ExporterPlugin,
} from './types/index.js';
import type { FormatAdapter } from './core/format-adapter.js';

export interface DocumentConverterOptions {
  /**
   * Format adapter to use for intermediate representation
   * Defaults to Portable Text adapter
   */
  adapter?: FormatAdapter;

  /**
   * Maximum input document size in bytes (default: 10MB)
   * Set to 0 to disable size validation
   */
  maxDocumentSize?: number;

  /**
   * Maximum nesting depth for blocks (default: 50)
   * Prevents stack overflow from deeply nested structures
   */
  maxBlockDepth?: number;

  /**
   * Maximum number of blocks in a document (default: 10000)
   * Prevents memory exhaustion from malicious inputs
   */
  maxBlocks?: number;
}

export class DocumentConverter {
  private registry: PluginRegistry;
  public readonly adapter: FormatAdapter;
  private readonly maxDocumentSize: number;
  private readonly maxBlockDepth: number;
  private readonly maxBlocks: number;

  constructor(options?: DocumentConverterOptions) {
    this.adapter = options?.adapter || portableTextAdapter;
    this.maxDocumentSize = options?.maxDocumentSize ?? 10 * 1024 * 1024; // 10MB default
    this.maxBlockDepth = options?.maxBlockDepth ?? 50;
    this.maxBlocks = options?.maxBlocks ?? 10000;
    this.registry = new PluginRegistry();
    this.registerDefaultPlugins();
  }

  /**
   * Register default importers and exporters
   */
  private registerDefaultPlugins(): void {
    // Register importers
    this.registry.registerImporter(new MarkdownImporter());
    this.registry.registerImporter(new NotionImporter());
    this.registry.registerImporter(new RoamImporter());

    // Register exporters
    this.registry.registerExporter(new MarkdownExporter());
    this.registry.registerExporter(new NotionExporter());
    this.registry.registerExporter(new RoamExporter());
    this.registry.registerExporter(new HtmlExporter());
  }

  /**
   * Register a custom importer plugin
   * @param plugin - The importer plugin to register
   * @param options - Registration options (e.g., allowOverwrite)
   * @throws {Error} If plugin name is already registered (unless allowOverwrite is true)
   */
  registerImporter(plugin: ImporterPlugin, options?: import('./plugins/plugin-registry.js').PluginRegistrationOptions): void {
    this.registry.registerImporter(plugin, options);
  }

  /**
   * Register a custom exporter plugin
   * @param plugin - The exporter plugin to register
   * @param options - Registration options (e.g., allowOverwrite)
   * @throws {Error} If plugin name is already registered (unless allowOverwrite is true)
   */
  registerExporter(plugin: ExporterPlugin, options?: import('./plugins/plugin-registry.js').PluginRegistrationOptions): void {
    this.registry.registerExporter(plugin, options);
  }

  /**
   * Register a custom importer plugin asynchronously with thread safety
   * @param plugin - The importer plugin to register
   * @param options - Registration options (e.g., allowOverwrite)
   */
  async registerImporterAsync(plugin: ImporterPlugin, options?: import('./plugins/plugin-registry.js').PluginRegistrationOptions): Promise<void> {
    return this.registry.registerImporterAsync(plugin, options);
  }

  /**
   * Register a custom exporter plugin asynchronously with thread safety
   * @param plugin - The exporter plugin to register
   * @param options - Registration options (e.g., allowOverwrite)
   */
  async registerExporterAsync(plugin: ExporterPlugin, options?: import('./plugins/plugin-registry.js').PluginRegistrationOptions): Promise<void> {
    return this.registry.registerExporterAsync(plugin, options);
  }

  /**
   * Unregister an importer plugin by name
   * @param name - The name of the importer to remove
   */
  unregisterImporter(name: string): void {
    this.registry.unregisterImporter(name);
  }

  /**
   * Unregister an exporter plugin by name
   * @param name - The name of the exporter to remove
   */
  unregisterExporter(name: string): void {
    this.registry.unregisterExporter(name);
  }

  /**
   * Check if an importer plugin exists
   * @param name - The name of the importer to check
   * @returns true if the importer exists, false otherwise
   */
  hasImporter(name: string): boolean {
    return this.registry.hasImporter(name);
  }

  /**
   * Check if an exporter plugin exists
   * @param name - The name of the exporter to check
   * @returns true if the exporter exists, false otherwise
   */
  hasExporter(name: string): boolean {
    return this.registry.hasExporter(name);
  }

  /**
   * Import a document from various formats
   * Automatically detects the format if not specified
   *
   * @throws {ConversionError} If input exceeds size limits or validation fails
   */
  async import(
    input: string,
    options?: ImportOptions & { format?: string }
  ): Promise<ConvertedDocument> {
    // Validate input size
    if (this.maxDocumentSize > 0) {
      const inputSize = Buffer.byteLength(input, 'utf-8');
      if (inputSize > this.maxDocumentSize) {
        throw new ConversionError(
          `Document size (${inputSize} bytes) exceeds maximum allowed size (${this.maxDocumentSize} bytes)`,
          'DOCUMENT_TOO_LARGE',
          { size: inputSize, maxSize: this.maxDocumentSize }
        );
      }
    }

    const document = await this.registry.import(input, {
      ...options,
      importer: options?.format,
    });

    // Validate block count
    if (this.maxBlocks > 0 && document.content.length > this.maxBlocks) {
      throw new ConversionError(
        `Document contains ${document.content.length} blocks, exceeds maximum of ${this.maxBlocks}`,
        'TOO_MANY_BLOCKS',
        { blockCount: document.content.length, maxBlocks: this.maxBlocks }
      );
    }

    // Validate nesting depth
    if (this.maxBlockDepth > 0) {
      const maxDepth = this.calculateMaxDepth(document.content);
      if (maxDepth > this.maxBlockDepth) {
        throw new ConversionError(
          `Document nesting depth (${maxDepth}) exceeds maximum allowed depth (${this.maxBlockDepth})`,
          'NESTING_TOO_DEEP',
          { depth: maxDepth, maxDepth: this.maxBlockDepth }
        );
      }
    }

    return document;
  }

  /**
   * Calculate maximum nesting depth of blocks
   */
  private calculateMaxDepth(blocks: any[], currentDepth = 0): number {
    let maxDepth = currentDepth;

    for (const block of blocks) {
      const children = block.children || [];
      if (Array.isArray(children) && children.length > 0) {
        const depth = this.calculateMaxDepth(children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * Export a document to the specified format
   */
  async export(
    document: ConvertedDocument,
    format: string,
    options?: ExportOptions
  ): Promise<string> {
    return this.registry.export(document, format, options);
  }

  /**
   * Convert from one format to another in a single call
   */
  async convert(
    input: string,
    targetFormat: string,
    options?: {
      sourceFormat?: string;
      importOptions?: ImportOptions;
      exportOptions?: ExportOptions;
    }
  ): Promise<string> {
    const doc = await this.import(input, {
      ...options?.importOptions,
      format: options?.sourceFormat,
    });

    return this.export(doc, targetFormat, options?.exportOptions);
  }

  /**
   * List all available importers
   */
  listImporters(): string[] {
    return this.registry.listImporters().map((i) => i.name);
  }

  /**
   * List all available exporters
   */
  listExporters(): string[] {
    return this.registry.listExporters().map((e) => e.name);
  }

  /**
   * Get the plugin registry for advanced usage
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }
}

// Export types and utilities
export * from './types/index.js';
export * from './core/portable-text-utils.js';
export { PluginRegistry } from './plugins/plugin-registry.js';
export type { PluginRegistrationOptions } from './plugins/plugin-registry.js';

// Export format adapter interfaces and implementations
export type { FormatAdapter, IntermediateDocument, BlockStyle, ListType, TextMark, CalloutType } from './core/format-adapter.js';
export { BaseFormatAdapter } from './core/format-adapter.js';
export { PortableTextAdapter, portableTextAdapter } from './adapters/portable-text-adapter.js';

// Export built-in plugins
export { MarkdownImporter } from './importers/markdown-importer.js';
export { NotionImporter } from './importers/notion-importer.js';
export { RoamImporter } from './importers/roam-importer.js';
export { PdfImporter } from './importers/pdf-importer.js';
export { MarkdownExporter } from './exporters/markdown-exporter.js';
export { NotionExporter } from './exporters/notion-exporter.js';
export { RoamExporter } from './exporters/roam-exporter.js';
export { HtmlExporter } from './exporters/html-exporter.js';

// Export extractors
export { PdfExtractor } from './extractors/pdf-extractor.js';
export { ImageExtractor } from './extractors/image-extractor.js';

// Export PDF and image types
export type {
  PdfMetadata,
  PdfExtractionResult,
  ImageMetadata,
  OCRProvider,
  OCRResult,
  PdfImportOptions,
} from './types/pdf.js';

// Default export
export default DocumentConverter;
