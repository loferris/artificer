/**
 * Example: Custom Format Adapter
 *
 * This demonstrates how to create a custom adapter for a different
 * intermediate format. This example uses a simple JSON-based format.
 */

import {
  BaseFormatAdapter,
  type BlockStyle,
  type ListType,
  type CalloutType,
} from '../src/core/format-adapter.js';

/**
 * Simple JSON format for intermediate representation
 *
 * Structure:
 * {
 *   type: 'paragraph' | 'heading' | 'code' | etc,
 *   id: 'unique-id',
 *   content: [...children],
 *   attrs: { style, level, etc }
 * }
 */

interface SimpleBlock {
  type: string;
  id: string;
  content?: any[];
  text?: string;
  attrs?: Record<string, any>;
}

/**
 * Custom adapter using a simpler JSON structure
 */
export class SimpleJsonAdapter extends BaseFormatAdapter {
  readonly name = 'simple-json';

  createTextBlock(
    children: any[],
    options?: {
      style?: BlockStyle;
      listItem?: ListType;
      level?: number;
      marks?: any[];
    }
  ): SimpleBlock {
    const block: SimpleBlock = {
      type: options?.listItem ? 'list-item' : 'paragraph',
      id: this.generateKey(),
      content: children,
      attrs: {},
    };

    if (options?.style && options.style !== 'normal') {
      block.attrs!.style = options.style;
    }

    if (options?.listItem) {
      block.attrs!.listType = options.listItem;
      block.attrs!.level = options.level || 1;
    }

    if (options?.marks && options.marks.length > 0) {
      block.attrs!.marks = options.marks;
    }

    return block;
  }

  createSpan(text: string, marks: string[] = []): SimpleBlock {
    return {
      type: 'text',
      id: this.generateKey(),
      text,
      attrs: marks.length > 0 ? { marks } : undefined,
    };
  }

  createCodeBlock(code: string, language?: string): SimpleBlock {
    return {
      type: 'code',
      id: this.generateKey(),
      text: code,
      attrs: language ? { language } : undefined,
    };
  }

  createImageBlock(url: string, alt?: string, caption?: string): SimpleBlock {
    return {
      type: 'image',
      id: this.generateKey(),
      attrs: {
        url,
        alt,
        caption,
      },
    };
  }

  createTableBlock(rows: { cells: string[]; header?: boolean }[]): SimpleBlock {
    return {
      type: 'table',
      id: this.generateKey(),
      attrs: { rows },
    };
  }

  createCalloutBlock(children: any[], type: CalloutType): SimpleBlock {
    return {
      type: 'callout',
      id: this.generateKey(),
      content: children,
      attrs: { calloutType: type },
    };
  }

  createLinkMark(href: string, title?: string): { key: string; def: any } {
    const key = this.generateKey();
    return {
      key,
      def: {
        type: 'link',
        href,
        title,
      },
    };
  }

  createWikiLinkMark(target: string, alias?: string): { key: string; def: any } {
    const key = this.generateKey();
    return {
      key,
      def: {
        type: 'wikilink',
        target,
        alias,
      },
    };
  }

  extractPlainText(blocks: SimpleBlock[]): string {
    return blocks
      .map((block) => {
        if (block.text) {
          return block.text;
        }
        if (block.content && Array.isArray(block.content)) {
          return this.extractPlainText(block.content);
        }
        return '';
      })
      .join('\n');
  }

  getBlockType(block: SimpleBlock): string {
    return block.type;
  }

  hasChildren(block: SimpleBlock): boolean {
    return !!block.content && Array.isArray(block.content);
  }

  getChildren(block: SimpleBlock): any[] {
    return block.content || [];
  }

  getSpanText(span: SimpleBlock): string {
    return span.text || '';
  }

  getSpanMarks(span: SimpleBlock): string[] {
    return span.attrs?.marks || [];
  }

  getBlockStyle(block: SimpleBlock): BlockStyle | undefined {
    return block.attrs?.style;
  }

  getListType(block: SimpleBlock): ListType | undefined {
    return block.attrs?.listType;
  }

  getListLevel(block: SimpleBlock): number | undefined {
    return block.attrs?.level;
  }

  getMarkDefs(block: SimpleBlock): any[] {
    return block.attrs?.marks || [];
  }

  getCode(block: SimpleBlock): string | undefined {
    return block.text;
  }

  getLanguage(block: SimpleBlock): string | undefined {
    return block.attrs?.language;
  }

  getImageUrl(block: SimpleBlock): string | undefined {
    return block.attrs?.url;
  }

  getImageAlt(block: SimpleBlock): string | undefined {
    return block.attrs?.alt;
  }

  getTableRows(block: SimpleBlock): { cells: string[]; header?: boolean }[] | undefined {
    return block.attrs?.rows;
  }

  getCalloutType(block: SimpleBlock): CalloutType | undefined {
    return block.attrs?.calloutType;
  }
}

/**
 * Usage example
 */
async function example() {
  const { DocumentConverter } = await import('../src/index.js');

  // Create converter with custom adapter
  const converter = new DocumentConverter({
    adapter: new SimpleJsonAdapter(),
  });

  // Now all imports will use the SimpleJson format instead of Portable Text!
  const doc = await converter.import(`# Hello World\n\nThis uses **SimpleJson** format.`);

  console.log('Document with SimpleJson adapter:');
  console.log(JSON.stringify(doc, null, 2));

  // Export works the same way
  const markdown = await converter.export(doc, 'markdown');
  console.log('\nExported back to markdown:');
  console.log(markdown);
}

// Export the adapter
export default SimpleJsonAdapter;
