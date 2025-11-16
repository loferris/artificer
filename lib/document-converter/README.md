# Document Converter

A format-agnostic document conversion library using Portable Text as the intermediate format. Think of it as a lightweight, extensible Pandoc alternative specifically designed for knowledge management tools.

## Features

- 🔄 **Format Agnostic**: Convert between Markdown, Notion, Roam Research, and more
- 📝 **Portable Text**: Uses Portable Text as the universal intermediate format
- 🔌 **Extensible**: Easy plugin system for adding new formats
- 🎯 **Type Safe**: Full TypeScript support
- 🧪 **Well Tested**: Comprehensive test coverage
- 📦 **Zero Config**: Works out of the box with sensible defaults

## Supported Formats

### Importers
- **Markdown** - Full CommonMark + GFM support, Obsidian-compatible (wiki links, callouts, frontmatter)
- **Notion** - Notion API format and export format
- **Roam Research** - Roam JSON export format

### Exporters
- **Markdown** - GitHub Flavored Markdown with Obsidian extensions
- **Notion** - Notion API format
- **Roam Research** - Roam JSON format

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
// Import Roam page
const roamPage = {
  title: 'My Page',
  children: [
    {
      string: 'First block with **bold** text',
      uid: 'abc123',
      children: [
        {
          string: 'Nested block',
          uid: 'def456',
        },
      ],
    },
  ],
};

const doc = await converter.import(JSON.stringify(roamPage), {
  format: 'roam',
});
```

## Portable Text Format

Documents are converted to Portable Text, a JSON-based rich text specification:

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
- `registerImporter(plugin: ImporterPlugin)` - Register a custom importer
- `registerExporter(plugin: ExporterPlugin)` - Register a custom exporter
- `listImporters()` - List available importers
- `listExporters()` - List available exporters

#### Options

**ImportOptions**
```typescript
{
  preserveUnknownBlocks?: boolean;  // Keep unrecognized blocks
  preserveMetadata?: boolean;        // Preserve all metadata
  includeSourceMap?: boolean;        // Include source mapping info
  strictMode?: boolean;              // Fail on unknown elements
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
