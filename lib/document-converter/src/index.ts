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
}

export class DocumentConverter {
  private registry: PluginRegistry;
  public readonly adapter: FormatAdapter;

  constructor(options?: DocumentConverterOptions) {
    this.adapter = options?.adapter || portableTextAdapter;
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
   */
  registerImporter(plugin: ImporterPlugin): void {
    this.registry.registerImporter(plugin);
  }

  /**
   * Register a custom exporter plugin
   */
  registerExporter(plugin: ExporterPlugin): void {
    this.registry.registerExporter(plugin);
  }

  /**
   * Import a document from various formats
   * Automatically detects the format if not specified
   */
  async import(
    input: string,
    options?: ImportOptions & { format?: string }
  ): Promise<ConvertedDocument> {
    return this.registry.import(input, {
      ...options,
      importer: options?.format,
    });
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
