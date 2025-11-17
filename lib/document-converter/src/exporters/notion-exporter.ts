/**
 * Notion JSON exporter
 * Exports to Notion API format
 */

import type {
  ExporterPlugin,
  ConvertedDocument,
  ExportOptions,
} from '../types/index';
import type { PortableTextSpan } from '@portabletext/types';

export class NotionExporter implements ExporterPlugin {
  name = 'notion';
  targetFormat = 'notion';

  async export(
    document: ConvertedDocument,
    options?: ExportOptions
  ): Promise<string> {
    const blocks = this.convertBlocks(document.content);

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

  /**
   * Convert blocks handling nested list structure
   */
  private convertBlocks(blocks: any[], startIndex: number = 0, endIndex?: number): any[] {
    const result: any[] = [];
    const end = endIndex ?? blocks.length;
    let i = startIndex;

    while (i < end) {
      const block = blocks[i];

      // Check if this is a list item with potential children
      if (block.listItem && block.level) {
        const converted = this.convertBlock(block);
        if (converted) {
          // Look ahead for immediate children (level + 1)
          let j = i + 1;
          const childStartIndex = j;

          // Find the range of all child blocks
          while (j < end && blocks[j].listItem && blocks[j].level > block.level) {
            j++;
          }

          // Recursively convert children if any exist
          if (j > childStartIndex) {
            const blockType = block.listItem === 'number' ? 'numbered_list_item' : 'bulleted_list_item';
            converted[blockType].children = this.convertBlocks(blocks, childStartIndex, j);
          }

          result.push(converted);
          i = j;
          continue;
        }
      } else {
        const converted = this.convertBlock(block);
        if (converted) {
          result.push(converted);
        }
      }

      i++;
    }

    return result;
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
      case 'embed':
        return this.convertEmbedBlock(block, baseBlock);
      case 'file':
        return this.convertFileBlock(block, baseBlock);
      case 'video':
        return this.convertVideoBlock(block, baseBlock);
      case 'audio':
        return this.convertAudioBlock(block, baseBlock);
      case 'childPage':
        return this.convertChildPageBlock(block, baseBlock);
      case 'tableOfContents':
        return this.convertTableOfContentsBlock(block, baseBlock);
      case 'linkPreview':
        return this.convertLinkPreviewBlock(block, baseBlock);
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

        if (markDef?._type === 'link') {
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
    const richText = this.convertSpans(block.children || [], block.markDefs || []);

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

  private convertEmbedBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'embed',
      embed: {
        url: block.url || '',
      },
    };
  }

  private convertFileBlock(block: any, baseBlock: any): any {
    const blockType = block.type === 'pdf' ? 'pdf' : 'file';
    return {
      ...baseBlock,
      type: blockType,
      [blockType]: {
        type: 'external',
        external: {
          url: block.url || '',
        },
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

  private convertVideoBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'video',
      video: {
        type: block.provider || 'external',
        [block.provider || 'external']: {
          url: block.url || '',
        },
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

  private convertAudioBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'audio',
      audio: {
        type: 'external',
        external: {
          url: block.url || '',
        },
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

  private convertChildPageBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'child_page',
      child_page: {
        title: block.title || 'Untitled',
      },
    };
  }

  private convertTableOfContentsBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'table_of_contents',
      table_of_contents: {
        color: block.color || 'default',
      },
    };
  }

  private convertLinkPreviewBlock(block: any, baseBlock: any): any {
    return {
      ...baseBlock,
      type: 'link_preview',
      link_preview: {
        url: block.url || '',
      },
    };
  }
}
