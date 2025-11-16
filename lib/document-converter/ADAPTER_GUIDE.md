# Format Adapter Guide

The Document Converter library now supports **pluggable intermediate formats** through the Format Adapter system. This allows you to swap out Portable Text for any other intermediate representation (ProseMirror, Slate, your custom AST, etc.) without changing importers or exporters.

## Architecture

```
┌──────────────┐
│Input Format  │
│(Markdown,    │
│ Notion, etc) │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│   Importer       │
│  (uses adapter)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐     ┌─────────────────┐
│Format Adapter    │◄────│  Swappable!     │
│  (Portable Text, │     │  - Portable Text│
│   ProseMirror,   │     │  - ProseMirror  │
│   Slate, etc)    │     │  - Custom AST   │
└──────┬───────────┘     └─────────────────┘
       │
       ▼
┌──────────────────┐
│  Intermediate    │
│  Representation  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Exporter       │
│  (uses adapter)  │
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│Output Format │
│(Markdown,    │
│ Notion, etc) │
└──────────────┘
```

## Why Use Custom Adapters?

1. **Performance**: Your AST might be more efficient for your use case
2. **Integration**: Match your existing editor's document model (ProseMirror, Slate, etc.)
3. **Features**: Support custom features not in Portable Text
4. **Simplicity**: Use a simpler structure if you don't need Portable Text's complexity
5. **Flexibility**: Switch intermediate formats without rewriting importers/exporters

## Quick Start

### Default Usage (Portable Text)

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';

// Uses Portable Text by default
const converter = new DocumentConverter();

const doc = await converter.import(markdownContent);
const notion = await converter.export(doc, 'notion');
```

### Using a Custom Adapter

```typescript
import { DocumentConverter, BaseFormatAdapter } from '@ai-workflow/document-converter';

// Create your custom adapter
class MyAdapter extends BaseFormatAdapter {
  readonly name = 'my-format';

  createTextBlock(children, options) {
    // Return your format's text block
    return { type: 'paragraph', content: children, ...options };
  }

  // ... implement other methods
}

// Use it
const converter = new DocumentConverter({
  adapter: new MyAdapter()
});

// Now all conversions use your format!
const doc = await converter.import(markdownContent);
```

## Creating a Custom Adapter

### Step 1: Extend BaseFormatAdapter

```typescript
import { BaseFormatAdapter, type BlockStyle, type CalloutType } from '@ai-workflow/document-converter';

export class MyCustomAdapter extends BaseFormatAdapter {
  readonly name = 'my-custom-format';

  // Implement required methods...
}
```

### Step 2: Implement Block Creation Methods

These methods create blocks in your format:

```typescript
// Create text blocks (paragraphs, headings)
createTextBlock(children: any[], options?: {
  style?: BlockStyle;
  listItem?: 'bullet' | 'number';
  level?: number;
}): any {
  // Return a block in your format
  return {
    type: options?.style || 'paragraph',
    id: this.generateKey(),
    content: children,
    attrs: options,
  };
}

// Create text spans
createSpan(text: string, marks?: string[]): any {
  return {
    type: 'text',
    value: text,
    formatting: marks || [],
  };
}

// Create code blocks
createCodeBlock(code: string, language?: string): any {
  return {
    type: 'code',
    language,
    content: code,
  };
}

// Create images
createImageBlock(url: string, alt?: string, caption?: string): any {
  return {
    type: 'image',
    src: url,
    alt,
    caption,
  };
}

// And so on for tables, callouts, etc.
```

### Step 3: Implement Block Reading Methods

These methods extract data from your format:

```typescript
getBlockType(block: any): string {
  return block.type;
}

hasChildren(block: any): boolean {
  return !!block.content;
}

getChildren(block: any): any[] {
  return block.content || [];
}

getSpanText(span: any): string {
  return span.value || '';
}

getSpanMarks(span: any): string[] {
  return span.formatting || [];
}

// And so on...
```

### Step 4: Implement Mark Creation

For links and other marks:

```typescript
createLinkMark(href: string, title?: string): { key: string; def: any } {
  const key = this.generateKey();
  return {
    key,
    def: { type: 'link', url: href, title },
  };
}

createWikiLinkMark(target: string, alias?: string): { key: string; def: any } {
  const key = this.generateKey();
  return {
    key,
    def: { type: 'wikilink', page: target, displayText: alias },
  };
}
```

## Complete Example: ProseMirror Adapter

```typescript
import { BaseFormatAdapter, type BlockStyle } from '@ai-workflow/document-converter';

/**
 * ProseMirror adapter for Document Converter
 */
export class ProseMirrorAdapter extends BaseFormatAdapter {
  readonly name = 'prosemirror';

  createTextBlock(children: any[], options?: { style?: BlockStyle; listItem?: string; level?: number }): any {
    const type = options?.listItem
      ? 'list_item'
      : options?.style === 'blockquote'
        ? 'blockquote'
        : options?.style?.startsWith('h')
          ? 'heading'
          : 'paragraph';

    const node: any = {
      type,
      content: children,
    };

    if (type === 'heading') {
      node.attrs = { level: parseInt(options!.style!.substring(1)) };
    }

    return node;
  }

  createSpan(text: string, marks: string[] = []): any {
    return {
      type: 'text',
      text,
      marks: marks.map(m => ({ type: m })),
    };
  }

  createCodeBlock(code: string, language?: string): any {
    return {
      type: 'code_block',
      attrs: { language },
      content: [{ type: 'text', text: code }],
    };
  }

  createImageBlock(url: string, alt?: string): any {
    return {
      type: 'image',
      attrs: { src: url, alt },
    };
  }

  createTableBlock(rows: { cells: string[]; header?: boolean }[]): any {
    return {
      type: 'table',
      content: rows.map((row, i) => ({
        type: 'table_row',
        content: row.cells.map(cell => ({
          type: i === 0 && row.header ? 'table_header' : 'table_cell',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: cell }] }],
        })),
      })),
    };
  }

  createCalloutBlock(children: any[], type: string): any {
    return {
      type: 'callout',
      attrs: { calloutType: type },
      content: children,
    };
  }

  createLinkMark(href: string): { key: string; def: any } {
    const key = this.generateKey();
    return {
      key,
      def: { type: 'link', attrs: { href } },
    };
  }

  createWikiLinkMark(target: string): { key: string; def: any } {
    const key = this.generateKey();
    return {
      key,
      def: { type: 'wikilink', attrs: { target } },
    };
  }

  // Reading methods
  getBlockType(block: any): string {
    return block.type;
  }

  hasChildren(block: any): boolean {
    return !!block.content;
  }

  getChildren(block: any): any[] {
    return block.content || [];
  }

  getSpanText(span: any): string {
    return span.text || '';
  }

  getSpanMarks(span: any): string[] {
    return (span.marks || []).map((m: any) => m.type);
  }

  getBlockStyle(block: any): BlockStyle | undefined {
    if (block.type === 'heading') {
      return `h${block.attrs?.level}` as BlockStyle;
    }
    if (block.type === 'blockquote') {
      return 'blockquote';
    }
    return 'normal';
  }

  getCode(block: any): string | undefined {
    if (block.type === 'code_block' && block.content) {
      return block.content.map((n: any) => n.text).join('');
    }
    return undefined;
  }

  getLanguage(block: any): string | undefined {
    return block.attrs?.language;
  }

  getImageUrl(block: any): string | undefined {
    return block.attrs?.src;
  }

  getImageAlt(block: any): string | undefined {
    return block.attrs?.alt;
  }

  extractPlainText(blocks: any[]): string {
    return blocks.map(block => {
      if (block.text) return block.text;
      if (block.content) return this.extractPlainText(block.content);
      return '';
    }).join('\n');
  }

  // Other required methods with default implementations...
  getListType() { return undefined; }
  getListLevel() { return undefined; }
  getMarkDefs() { return []; }
  getTableRows() { return undefined; }
  getCalloutType() { return undefined; }
}
```

### Usage

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';
import { ProseMirrorAdapter } from './prosemirror-adapter';

const converter = new DocumentConverter({
  adapter: new ProseMirrorAdapter()
});

// Now imports create ProseMirror documents!
const pmDoc = await converter.import(markdown);

// And exports read from ProseMirror format
const notion = await converter.export(pmDoc, 'notion');
```

## Benefits of This Approach

### ✅ Zero Breaking Changes

Existing code works without modification:

```typescript
// This still works!
const converter = new DocumentConverter();
const doc = await converter.import(markdown);
```

### ✅ Easy to Swap

Change one line to switch formats:

```typescript
// Before
const converter = new DocumentConverter();

// After
const converter = new DocumentConverter({ adapter: new MyAdapter() });
```

### ✅ Importers/Exporters Stay the Same

You don't need to rewrite your importers and exporters. They use the adapter automatically:

```typescript
class MarkdownImporter implements ImporterPlugin {
  async import(input: string) {
    // This code doesn't change!
    // It uses converter.adapter.createTextBlock() automatically
  }
}
```

### ✅ Type Safe

Full TypeScript support with generics:

```typescript
interface ConvertedDocument<T = any> {
  content: T[];
  metadata: DocumentMetadata;
}

// Specific type
const ptDoc: ConvertedDocument<PortableTextBlock> = await converter.import(md);

// Generic type
const doc: ConvertedDocument = await converter.import(md);
```

## Migration Guide

### From Coupled Code

**Before (tightly coupled to Portable Text):**

```typescript
import { DocumentConverter } from '@ai-workflow/document-converter';

const converter = new DocumentConverter();
const doc = await converter.import(markdown);

// doc.content is always Portable Text
```

**After (adapter-based):**

```typescript
import { DocumentConverter, MyAdapter } from '@ai-workflow/document-converter';

// Default: Portable Text (no changes needed)
const ptConverter = new DocumentConverter();

// Custom: Your format
const myConverter = new DocumentConverter({ adapter: new MyAdapter() });

// Both work the same way!
const ptDoc = await ptConverter.import(markdown);
const myDoc = await myConverter.import(markdown);
```

### Implementing a Minimal Adapter

If you don't need all features, you can implement a minimal adapter:

```typescript
class MinimalAdapter extends BaseFormatAdapter {
  readonly name = 'minimal';

  // Only implement what you need
  createTextBlock(children: any[]) {
    return { type: 'p', children };
  }

  createSpan(text: string) {
    return { text };
  }

  getBlockType(block: any) {
    return block.type || 'unknown';
  }

  getSpanText(span: any) {
    return span.text || '';
  }

  // Use defaults for everything else
  createCodeBlock() { return {}; }
  createImageBlock() { return {}; }
  // ... etc
}
```

## See Also

- [Example: SimpleJson Adapter](./examples/custom-adapter.ts) - Full working example
- [Portable Text Adapter Source](./src/adapters/portable-text-adapter.ts) - Reference implementation
- [Format Adapter Interface](./src/core/format-adapter.ts) - Complete API
