/**
 * Plugin registry for managing importers and exporters
 *
 * Thread-safety note:
 * - Read operations (get, list, detect) are safe for concurrent access
 * - Write operations (register, clear) should not be called concurrently
 * - If using with Worker Threads, ensure registration happens during initialization
 */

import type {
  ImporterPlugin,
  ExporterPlugin,
  ConvertedDocument,
  ImportOptions,
  ExportOptions,
} from '../types/index.js';
import { ConversionError } from '../types/index.js';

export interface PluginRegistrationOptions {
  /**
   * If true, allows overwriting existing plugins with the same name
   * Default: false
   */
  allowOverwrite?: boolean;
}

export class PluginRegistry {
  private importers = new Map<string, ImporterPlugin>();
  private exporters = new Map<string, ExporterPlugin>();
  private registrationLock = Promise.resolve();

  /**
   * Register an importer plugin
   * @throws {ConversionError} If plugin with same name exists and allowOverwrite is false
   */
  registerImporter(
    plugin: ImporterPlugin,
    options?: PluginRegistrationOptions
  ): void {
    const allowOverwrite = options?.allowOverwrite ?? false;
    const existing = this.importers.get(plugin.name);

    if (existing && !allowOverwrite) {
      throw new ConversionError(
        `Importer plugin "${plugin.name}" is already registered. Use allowOverwrite option to replace it.`,
        'DUPLICATE_PLUGIN',
        { existingPlugin: existing.name, newPlugin: plugin.name }
      );
    }

    this.importers.set(plugin.name, plugin);
  }

  /**
   * Register an exporter plugin
   * @throws {ConversionError} If plugin with same name exists and allowOverwrite is false
   */
  registerExporter(
    plugin: ExporterPlugin,
    options?: PluginRegistrationOptions
  ): void {
    const allowOverwrite = options?.allowOverwrite ?? false;
    const existing = this.exporters.get(plugin.name);

    if (existing && !allowOverwrite) {
      throw new ConversionError(
        `Exporter plugin "${plugin.name}" is already registered. Use allowOverwrite option to replace it.`,
        'DUPLICATE_PLUGIN',
        { existingPlugin: existing.name, newPlugin: plugin.name }
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
   * Unregister an importer plugin by name
   * @returns true if the plugin was found and removed, false otherwise
   */
  unregisterImporter(name: string): boolean {
    return this.importers.delete(name);
  }

  /**
   * Unregister an exporter plugin by name
   * @returns true if the plugin was found and removed, false otherwise
   */
  unregisterExporter(name: string): boolean {
    return this.exporters.delete(name);
  }

  /**
   * Register an importer plugin with async safety for concurrent operations
   * Use this when registering plugins from async contexts or worker threads
   */
  async registerImporterAsync(
    plugin: ImporterPlugin,
    options?: PluginRegistrationOptions
  ): Promise<void> {
    // Chain registration operations to prevent concurrent modifications
    this.registrationLock = this.registrationLock.then(() => {
      this.registerImporter(plugin, options);
    });
    await this.registrationLock;
  }

  /**
   * Register an exporter plugin with async safety for concurrent operations
   * Use this when registering plugins from async contexts or worker threads
   */
  async registerExporterAsync(
    plugin: ExporterPlugin,
    options?: PluginRegistrationOptions
  ): Promise<void> {
    // Chain registration operations to prevent concurrent modifications
    this.registrationLock = this.registrationLock.then(() => {
      this.registerExporter(plugin, options);
    });
    await this.registrationLock;
  }

  /**
   * Check if an importer is registered
   */
  hasImporter(name: string): boolean {
    return this.importers.has(name);
  }

  /**
   * Check if an exporter is registered
   */
  hasExporter(name: string): boolean {
    return this.exporters.has(name);
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.importers.clear();
    this.exporters.clear();
  }
}
