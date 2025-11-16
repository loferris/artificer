# Document Converter

[![npm version](https://img.shields.io/npm/v/@ai-workflow/document-converter.svg)](https://www.npmjs.com/package/@ai-workflow/document-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

A format-agnostic document conversion library with **pluggable intermediate formats**. Think of it as a lightweight, extensible Pandoc alternative specifically designed for knowledge management tools.

## Features

- 🔄 **Format Agnostic**: Convert between Markdown, Notion, Roam Research, and more
- 📝 **Pluggable Formats**: Uses Portable Text by default, but swap to ProseMirror, Slate, or your own AST
- 🔌 **Extensible**: Easy plugin system for adding new formats
- 🎯 **Type Safe**: Full TypeScript support with generics
- 🧪 **Well Tested**: Comprehensive test coverage with 47+ test cases
- 📦 **Zero Config**: Works out of the box with sensible defaults
- 🔁 **Zero Breaking Changes**: Swap intermediate formats without rewriting importers/exporters
- 🗺️ **Source Maps**: Track blocks back to original document positions
- 🛡️ **Error Recovery**: Graceful handling with strict and non-strict modes

## Supported Formats

### Importers
- **Markdown** - Full CommonMark + GFM support, Obsidian-compatible
  - Wiki links: `[[Page Name]]` and `[[Page Name|Alias]]`
  - Callouts: `> [!info]`, `> [!warning]`, etc.
  - Frontmatter: YAML metadata
  - Nested lists with arbitrary depth
  - Source map tracking
- **Notion** - Notion API format and export format
  - Extended block types: embed, file, video, audio, columns
  - Column layouts and child pages
  - Table of contents and link previews
  - Nested lists with proper hierarchy
- **Roam Research** - Roam JSON export format
  - Page references: `[[Page Name]]` and `[[Page|Alias]]`
  - Block references: `((uid))`
  - Attributes: `key:: value`
  - TODO markers: `{{TODO}}` and `{{[DONE]}}`
  - Full formatting: bold, italic, code, strikethrough, highlight

### Exporters
- **Markdown** - GitHub Flavored Markdown with Obsidian extensions
- **Notion** - Notion API format with extended block types
- **Roam Research** - Roam JSON format with full feature support

## Installation

```bash
npm install @ai-workflow/document-converter
```

## Usage

### Basic Import/Export

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';

const converter = new DocumentConverter();

// Import from Markdown (auto-detected)
const doc = await converter.import(`
# Hello World

This is a **bold** statement with *italic* text.

- Item 1
- Item 2
`);

// Export to Notion
const notionJson = await converter.export(doc, 'notion');

// Export to Roam
const roamJson = await converter.export(doc, 'roam');
```

### Direct Format Conversion

```typescript
// Convert Markdown to Notion in one call
const notionJson = await converter.convert(
  markdownContent,
  'notion',
  { sourceFormat: 'markdown' }
);

// Convert Roam to Markdown
const markdown = await converter.convert(
  roamJson,
  'markdown',
  { sourceFormat: 'roam' }
);
```

### Working with Obsidian

```typescript
// Import Obsidian markdown with frontmatter
const obsidianMd = `---
title: My Note
tags: [project, ideas]
---

# My Note

This is a [[wiki link]] to another note.

> [!info]
> This is an Obsidian callout
`;

const doc = await converter.import(obsidianMd);

// Export back to Markdown with metadata
const exported = await converter.export(doc, 'markdown', {
  includeMetadata: true,
});
```

### Working with Notion

```typescript
// Import Notion page export
const notionPage = {
  object: 'page',
  properties: {
    title: {
      type: 'title',
      title: [{ plain_text: 'My Page' }],
    },
  },
  children: [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: 'Hello world' },
            plain_text: 'Hello world',
          },
        ],
      },
    },
  ],
};

const doc = await converter.import(JSON.stringify(notionPage), {
  format: 'notion',
});
```

### Working with Roam Research

```typescript
// Import Roam page with advanced features
const roamPage = {
  title: 'My Page',
  children: [
    {
      string: 'Link to [[Another Page]] or [[Page|Custom Alias]]',
      uid: 'abc123',
    },
    {
      string: 'Reference block ((def456)) here',
      uid: 'ghi789',
    },
    {
      string: 'author:: John Doe and status:: completed',
      uid: 'jkl012',
    },
    {
      string: '{{TODO}} Task to complete',
      uid: 'mno345',
    },
    {
      string: '{{[DONE]}} Completed task',
      uid: 'pqr678',
    },
    {
      string: '**Bold** and *italic* with `code` and ~~strike~~ and ^^highlight^^',
      uid: 'stu901',
    },
  ],
};

const doc = await converter.import(JSON.stringify(roamPage), {
  format: 'roam',
});
```

### Source Maps

Track the origin of each block in the converted document:

```typescript
// Import with source map
const markdown = `# Hello World

This is a paragraph.

## Section

Another paragraph here.`;

const doc = await converter.import(markdown, {
  includeSourceMap: true,
});

// Access source map
if (doc.sourceMap) {
  console.log('Source map version:', doc.sourceMap.version);
  console.log('Mappings:', doc.sourceMap.mappings);

  // Find original position of a block
  const block = doc.content[1]; // Second block
  const mapping = doc.sourceMap.mappings.find(m => m.blockKey === block._key);

  if (mapping) {
    console.log(`Block originated at line ${mapping.line}, column ${mapping.column}`);
    console.log(`Original type: ${mapping.originalType}`);
  }
}
```

### Error Recovery

Handle conversion errors gracefully:

```typescript
// Strict mode (default) - fails on first error
try {
  const doc = await converter.import(malformedInput);
} catch (error) {
  console.error('Conversion failed:', error.message);
}

// Non-strict mode - continues on errors
const errors: Error[] = [];
const doc = await converter.import(malformedInput, {
  strictMode: false,
  onError: (error, context) => {
    errors.push(error);
    console.warn(`Skipped block ${context.blockIndex}:`, error.message);
  },
});

console.log(`Converted with ${errors.length} errors`);
```

## Pluggable Intermediate Formats

**NEW!** You can now swap out the intermediate format without changing any importers or exporters:

```typescript
import { DocumentConverter, BaseFormatAdapter } from '@ai-workflow/document-converter';

// Create a custom adapter (e.g., for ProseMirror, Slate, etc.)
class MyAdapter extends BaseFormatAdapter {
  readonly name = 'my-format';

  createTextBlock(children, options) {
    return { type: 'paragraph', content: children };
  }

  // ... implement other methods
}

// Use your custom format
const converter = new DocumentConverter({
  adapter: new MyAdapter()
});

// All conversions now use your format!
const doc = await converter.import(markdown);
```

**Benefits:**
- ✅ **Zero breaking changes** - existing code works as-is
- ✅ **Swap formats easily** - change one line of code
- ✅ **Keep your importers/exporters** - they adapt automatically
- ✅ **Type safe** - full TypeScript support

See the **[Adapter Guide](./ADAPTER_GUIDE.md)** for complete documentation, examples, and a full ProseMirror adapter implementation.

## Portable Text Format (Default)

By default, documents are converted to Portable Text, a JSON-based rich text specification:

```typescript
import type { ConvertedDocument } from '@ai-workflow/document-converter';

const doc: ConvertedDocument = {
  content: [
    {
      _type: 'block',
      _key: 'abc123',
      style: 'h1',
      children: [
        {
          _type: 'span',
          _key: 'def456',
          text: 'Hello World',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'ghi789',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'jkl012',
          text: 'Bold text',
          marks: ['strong'],
        },
      ],
      markDefs: [],
    },
  ],
  metadata: {
    source: 'markdown',
    title: 'My Document',
    tags: ['example'],
  },
};
```

## Extending with Custom Plugins

### Custom Importer

```typescript
import type { ImporterPlugin, ConvertedDocument } from '@ai-workflow/document-converter';

class CustomImporter implements ImporterPlugin {
  name = 'custom';
  supportedFormats = ['custom'];

  detect(input: string | Buffer): boolean {
    // Implement detection logic
    return input.toString().startsWith('CUSTOM:');
  }

  async import(input: string, options?: ImportOptions): Promise<ConvertedDocument> {
    // Implement conversion to Portable Text
    return {
      content: [/* ... */],
      metadata: { source: 'custom' },
    };
  }
}

// Register the plugin
converter.registerImporter(new CustomImporter());
```

### Custom Exporter

```typescript
import type { ExporterPlugin, ConvertedDocument } from '@ai-workflow/document-converter';

class CustomExporter implements ExporterPlugin {
  name = 'custom';
  targetFormat = 'custom';

  async export(document: ConvertedDocument, options?: ExportOptions): Promise<string> {
    // Implement conversion from Portable Text
    return 'CUSTOM:' + /* ... */;
  }
}

// Register the plugin
converter.registerExporter(new CustomExporter());
```

## API Reference

### DocumentConverter

#### Methods

- `import(input: string, options?: ImportOptions)` - Import a document (auto-detects format)
- `export(document: ConvertedDocument, format: string, options?: ExportOptions)` - Export to a specific format
- `convert(input: string, targetFormat: string, options?)` - Convert directly between formats
- `registerImporter(plugin: ImporterPlugin, options?: PluginRegistrationOptions)` - Register a custom importer
- `registerExporter(plugin: ExporterPlugin, options?: PluginRegistrationOptions)` - Register a custom exporter
- `registerImporterAsync(plugin: ImporterPlugin, options?: PluginRegistrationOptions)` - Register importer with async safety
- `registerExporterAsync(plugin: ExporterPlugin, options?: PluginRegistrationOptions)` - Register exporter with async safety
- `unregisterImporter(name: string)` - Remove an importer plugin
- `unregisterExporter(name: string)` - Remove an exporter plugin
- `hasImporter(name: string)` - Check if importer exists
- `hasExporter(name: string)` - Check if exporter exists
- `listImporters()` - List available importers
- `listExporters()` - List available exporters

#### Options

**ImportOptions**
```typescript
{
  preserveUnknownBlocks?: boolean;  // Keep unrecognized blocks
  preserveMetadata?: boolean;        // Preserve all metadata
  includeSourceMap?: boolean;        // Include source mapping info (default: false)
  strictMode?: boolean;              // Throw on first error (default: true)
  onError?: (error: Error, context?: { blockIndex?: number; block?: any }) => void;
                                      // Error handler for non-strict mode
}
```

**ExportOptions**
```typescript
{
  format?: 'markdown' | 'json';      // Output format variant
  preserveCustomMarks?: boolean;     // Keep custom formatting
  includeMetadata?: boolean;         // Include frontmatter/metadata
  prettyPrint?: boolean;             // Format JSON output
}
```

**PluginRegistrationOptions**
```typescript
{
  allowOverwrite?: boolean;          // Allow replacing existing plugin (default: false)
}
```

## Use Cases

### In Your Application

Integrate with your document storage system:

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';
import { DocumentService } from './services/DocumentService';

class DocumentManager {
  private converter = new DocumentConverter();

  async uploadDocument(content: string, format: string, projectId: string) {
    // Import to Portable Text
    const doc = await this.converter.import(content, { format });

    // Store in your database
    await DocumentService.create({
      projectId,
      content: doc.content,        // Portable Text JSON
      metadata: doc.metadata,
      originalFormat: format,
    });
  }

  async exportDocument(documentId: string, targetFormat: string) {
    // Fetch from database
    const stored = await DocumentService.findById(documentId);

    // Export to target format
    return this.converter.export(
      {
        content: stored.content,
        metadata: stored.metadata,
      },
      targetFormat
    );
  }
}
```

### Batch Conversion

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';
import { readdir, readFile, writeFile } from 'fs/promises';

const converter = new DocumentConverter();

// Convert all Roam notes to Obsidian
const files = await readdir('./roam-export');

for (const file of files) {
  if (file.endsWith('.json')) {
    const content = await readFile(`./roam-export/${file}`, 'utf-8');
    const markdown = await converter.convert(content, 'markdown', {
      sourceFormat: 'roam',
      exportOptions: { includeMetadata: true },
    });

    await writeFile(
      `./obsidian-vault/${file.replace('.json', '.md')}`,
      markdown
    );
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Documents                          │
│  (Markdown, Notion JSON, Roam JSON, etc.)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Importers                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Markdown │  │  Notion  │  │   Roam   │  [Custom...]    │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Portable Text (Intermediate)                    │
│  - Format agnostic                                          │
│  - Rich type system                                         │
│  - Extensible blocks and marks                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Exporters                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Markdown │  │  Notion  │  │   Roam   │  [Custom...]    │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Output Documents                          │
│  (Markdown, Notion JSON, Roam JSON, etc.)                  │
└─────────────────────────────────────────────────────────────┘
```

## Roadmap

- [ ] Additional importers (Confluence, Google Docs, HTML)
- [ ] Additional exporters (PDF, DOCX, HTML)
- [ ] Bi-directional sync support
- [ ] Advanced formatting preservation
- [ ] Asset management (images, files)
- [ ] CLI tool for batch conversions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
