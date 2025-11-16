/**
 * Document Converter Library
 * A format-agnostic document conversion library using Portable Text as the intermediate format
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
 */

import { PluginRegistry } from './plugins/plugin-registry.js';
import { MarkdownImporter } from './importers/markdown-importer.js';
import { NotionImporter } from './importers/notion-importer.js';
import { RoamImporter } from './importers/roam-importer.js';
import { MarkdownExporter } from './exporters/markdown-exporter.js';
import { NotionExporter } from './exporters/notion-exporter.js';
import { RoamExporter } from './exporters/roam-exporter.js';

import type {
  ConvertedDocument,
  ImportOptions,
  ExportOptions,
  ImporterPlugin,
  ExporterPlugin,
} from './types/index.js';

export class DocumentConverter {
  private registry: PluginRegistry;

  constructor() {
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

// Export built-in plugins
export { MarkdownImporter } from './importers/markdown-importer.js';
export { NotionImporter } from './importers/notion-importer.js';
export { RoamImporter } from './importers/roam-importer.js';
export { MarkdownExporter } from './exporters/markdown-exporter.js';
export { NotionExporter } from './exporters/notion-exporter.js';
export { RoamExporter } from './exporters/roam-exporter.js';

// Default export
export default DocumentConverter;
