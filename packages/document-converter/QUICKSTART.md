# Quick Start Guide

Get up and running with the Document Converter in 5 minutes!

## Installation

```bash
npm install @artificer/document-converter
```

## Your First Conversion

```typescript
import { DocumentConverter } from '@artificer/document-converter';

const converter = new DocumentConverter();

// Import Markdown
const markdown = `
# Hello World

This is **bold** and this is *italic*.
`;

const doc = await converter.import(markdown);
console.log('Imported:', doc);

// Export to Notion
const notion = await converter.export(doc, 'notion');
console.log('As Notion:', notion);
```

## Common Use Cases

### 1. Obsidian → Notion

```typescript
const obsidianMd = `---
tags: [project]
---

# Project Notes

Important [[wiki link]] here.
`;

const notionJson = await converter.convert(obsidianMd, 'notion');
```

### 2. Notion → Markdown

```typescript
const notionPage = JSON.stringify({
  object: 'page',
  properties: { /* ... */ },
  children: [ /* ... */ ],
});

const markdown = await converter.convert(notionPage, 'markdown', {
  sourceFormat: 'notion',
});
```

### 3. Roam → Obsidian

```typescript
const roamExport = JSON.stringify({
  title: 'My Page',
  children: [ /* ... */ ],
});

const obsidianMd = await converter.convert(roamExport, 'markdown', {
  sourceFormat: 'roam',
  exportOptions: { includeMetadata: true },
});
```

## Integration with Your App

```typescript
import { DocumentConverter } from '@artificer/document-converter';

class DocumentService {
  private converter = new DocumentConverter();

  async storeDocument(content: string, format: string) {
    // Convert to Portable Text (format-agnostic)
    const doc = await this.converter.import(content, { format });

    // Store in database
    await db.documents.create({
      data: {
        content: JSON.stringify(doc.content),
        metadata: doc.metadata,
      },
    });
  }

  async getDocument(id: string, format: string) {
    // Fetch from database
    const stored = await db.documents.findUnique({ where: { id } });

    // Export to requested format
    return this.converter.export(
      {
        content: JSON.parse(stored.content),
        metadata: stored.metadata,
      },
      format
    );
  }
}
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out [examples](./examples/)
- Learn about [custom plugins](./README.md#extending-with-custom-plugins)
- View [API reference](./README.md#api-reference)

## Need Help?

- Check the [README](./README.md) for detailed documentation
- Look at [examples/](./examples/) for more use cases
- Review the [tests](./src/__tests__/) for usage patterns
