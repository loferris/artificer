/**
 * Plugin registry for managing importers and exporters
 */

import type {
  ImporterPlugin,
  ExporterPlugin,
  ConvertedDocument,
  ImportOptions,
  ExportOptions,
} from '../types/index.js';
import { ConversionError } from '../types/index.js';

export class PluginRegistry {
  private importers = new Map<string, ImporterPlugin>();
  private exporters = new Map<string, ExporterPlugin>();

  /**
   * Register an importer plugin
   */
  registerImporter(plugin: ImporterPlugin): void {
    if (this.importers.has(plugin.name)) {
      throw new ConversionError(
        `Importer plugin "${plugin.name}" is already registered`,
        'DUPLICATE_PLUGIN'
      );
    }
    this.importers.set(plugin.name, plugin);
  }

  /**
   * Register an exporter plugin
   */
  registerExporter(plugin: ExporterPlugin): void {
    if (this.exporters.has(plugin.name)) {
      throw new ConversionError(
        `Exporter plugin "${plugin.name}" is already registered`,
        'DUPLICATE_PLUGIN'
      );
    }
    this.exporters.set(plugin.name, plugin);
  }

  /**
   * Get an importer by name
   */
  getImporter(name: string): ImporterPlugin | undefined {
    return this.importers.get(name);
  }

  /**
   * Get an exporter by name
   */
  getExporter(name: string): ExporterPlugin | undefined {
    return this.exporters.get(name);
  }

  /**
   * Detect the appropriate importer for the given input
   */
  detectImporter(input: string | Buffer): ImporterPlugin | undefined {
    for (const importer of this.importers.values()) {
      if (importer.detect(input)) {
        return importer;
      }
    }
    return undefined;
  }

  /**
   * Get exporter by target format
   */
  getExporterByFormat(format: string): ExporterPlugin | undefined {
    for (const exporter of this.exporters.values()) {
      if (exporter.targetFormat === format) {
        return exporter;
      }
    }
    return undefined;
  }

  /**
   * List all registered importers
   */
  listImporters(): ImporterPlugin[] {
    return Array.from(this.importers.values());
  }

  /**
   * List all registered exporters
   */
  listExporters(): ExporterPlugin[] {
    return Array.from(this.exporters.values());
  }

  /**
   * Import a document using auto-detection
   */
  async import(
    input: string,
    options?: ImportOptions & { importer?: string }
  ): Promise<ConvertedDocument> {
    let importer: ImporterPlugin | undefined;

    if (options?.importer) {
      importer = this.getImporter(options.importer);
      if (!importer) {
        throw new ConversionError(
          `Importer "${options.importer}" not found`,
          'IMPORTER_NOT_FOUND'
        );
      }
    } else {
      importer = this.detectImporter(input);
      if (!importer) {
        throw new ConversionError(
          'Could not detect document format. Please specify an importer.',
          'DETECTION_FAILED'
        );
      }
    }

    return importer.import(input, options);
  }

  /**
   * Export a document to the specified format
   */
  async export(
    document: ConvertedDocument,
    targetFormat: string,
    options?: ExportOptions
  ): Promise<string> {
    const exporter = this.getExporterByFormat(targetFormat);
    if (!exporter) {
      throw new ConversionError(
        `No exporter found for format "${targetFormat}"`,
        'EXPORTER_NOT_FOUND'
      );
    }

    return exporter.export(document, options);
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.importers.clear();
    this.exporters.clear();
  }
}
