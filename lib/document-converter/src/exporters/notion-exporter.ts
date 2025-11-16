/**
 * Notion JSON exporter
 * Exports to Notion API format
 */

import type {
  ExporterPlugin,
  ConvertedDocument,
  ExportOptions,
} from '../types/index.js';
import type { PortableTextSpan } from '@portabletext/types';

export class NotionExporter implements ExporterPlugin {
  name = 'notion';
  targetFormat = 'notion';

  async export(
    document: ConvertedDocument,
    options?: ExportOptions
  ): Promise<string> {
    const blocks = document.content.map((block) => this.convertBlock(block));

    const result = {
      object: 'list',
      results: blocks.filter((b) => b !== null),
      has_more: false,
      next_cursor: null,
    };

    return JSON.stringify(
      result,
      null,
      options?.prettyPrint ? 2 : undefined
    );
  }

  private convertBlock(block: any): any {
    const baseBlock = {
      object: 'block',
      type: '',
      created_time: new Date().toISOString(),
      last_edited_time: new Date().toISOString(),
    };

    switch (block._type) {
      case 'block':
        return this.convertTextBlock(block, baseBlock);
      case 'code':
        return this.convertCodeBlock(block, baseBlock);
      case 'image':
        return this.convertImageBlock(block, baseBlock);
      case 'table':
        return this.convertTableBlock(block, baseBlock);
      case 'callout':
        return this.convertCalloutBlock(block, baseBlock);
      default:
        return null;
    }
  }

  private convertTextBlock(block: any, baseBlock: any): any {
    const richText = this.convertSpans(block.children || [], block.markDefs || []);

    // Determine block type
    if (block.style?.startsWith('h')) {
      const level = block.style.substring(1);
      return {
        ...baseBlock,
        type: `heading_${level}`,
        [`heading_${level}`]: { rich_text: richText },
      };
    }

    if (block.style === 'blockquote') {
      return {
        ...baseBlock,
        type: 'quote',
        quote: { rich_text: richText },
      };
    }

    if (block.listItem) {
      const type = block.listItem === 'number' ? 'numbered_list_item' : 'bulleted_list_item';
      return {
        ...baseBlock,
        type,
        [type]: { rich_text: richText },
      };
    }

    // Regular paragraph
    return {
      ...baseBlock,
      type: 'paragraph',
      paragraph: { rich_text: richText },
    };
  }

  private convertSpans(spans: PortableTextSpan[], markDefs: any[]): any[] {
    return spans.map((span) => {
      if (!('text' in span)) {
        return null;
      }

      const annotations: any = {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
      };

      let href: string | undefined;

      // Process marks
      for (const mark of span.marks || []) {
        const markDef = markDefs.find((def) => def._key === mark);

        if (markDef?.type === 'link') {
          href = markDef.href;
        } else {
          switch (mark) {
            case 'strong':
              annotations.bold = true;
              break;
            case 'em':
              annotations.italic = true;
              break;
            case 'strike':
              annotations.strikethrough = true;
              break;
            case 'underline':
              annotations.underline = true;
              break;
            case 'code':
              annotations.code = true;
              break;
          }
        }
      }

      const richTextObject: any = {
        type: 'text',
        text: {
          content: span.text,
          link: href ? { url: href } : null,
        },
        annotations,
        plain_text: span.text,
      };

      return richTextObject;
    }).filter(Boolean);
  }

  private convertCodeBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'code',
      code: {
        rich_text: [
          {
            type: 'text',
            text: { content: block.code || '' },
            plain_text: block.code || '',
          },
        ],
        language: block.language || 'plain text',
      },
    };
  }

  private convertImageBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'image',
      image: {
        type: 'external',
        external: { url: block.url || '' },
        caption: block.caption
          ? [
              {
                type: 'text',
                text: { content: block.caption },
                plain_text: block.caption,
              },
            ]
          : [],
      },
    };
  }

  private convertTableBlock(block: any, baseBlock: any): any {
    const rows = block.rows || [];
    const width = rows[0]?.cells?.length || 0;

    return {
      ...baseBlock,
      type: 'table',
      table: {
        table_width: width,
        has_column_header: rows[0]?.header || false,
        has_row_header: false,
        children: rows.map((row: any) => ({
          object: 'block',
          type: 'table_row',
          table_row: {
            cells: row.cells.map((cell: string) => [
              {
                type: 'text',
                text: { content: cell },
                plain_text: cell,
              },
            ]),
          },
        })),
      },
    };
  }

  private convertCalloutBlock(block: any, baseBlock: any): any {
    const richText = this.convertSpans(block.children || [], []);

    return {
      ...baseBlock,
      type: 'callout',
      callout: {
        rich_text: richText,
        icon: { type: 'emoji', emoji: this.getCalloutEmoji(block.calloutType) },
        color: this.getCalloutColor(block.calloutType),
      },
    };
  }

  private getCalloutEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      note: '📝',
    };
    return emojiMap[type] || '📝';
  }

  private getCalloutColor(type: string): string {
    const colorMap: Record<string, string> = {
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      success: 'green',
      note: 'gray',
    };
    return colorMap[type] || 'gray';
  }
}
