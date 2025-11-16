/**
 * Notion JSON importer
 * Supports both Notion API format and Notion export format
 */

import type {
  ImporterPlugin,
  ConvertedDocument,
  ImportOptions,
  NotionBlock,
  NotionPage,
} from '../types/index.js';
import { ConversionError } from '../types/index.js';
import {
  createTextBlock,
  createSpan,
  createCodeBlock,
  createImageBlock,
  createTableBlock,
  createCalloutBlock,
  generateKey,
  createMetadata,
} from '../core/portable-text-utils.js';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

export class NotionImporter implements ImporterPlugin {
  name = 'notion';
  supportedFormats = ['json'];

  detect(input: string | Buffer): boolean {
    try {
      const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;
      const data = JSON.parse(content);

      // Check for Notion-specific structure
      return (
        (data.object === 'page' || data.object === 'block') ||
        (Array.isArray(data) && data.some((item: any) => item.object === 'block')) ||
        (data.type && typeof data.type === 'string' && data[data.type]) // Notion export format
      );
    } catch {
      return false;
    }
  }

  async import(
    input: string,
    _options?: ImportOptions
  ): Promise<ConvertedDocument> {
    let data: any;

    try {
      data = JSON.parse(input);
    } catch (error) {
      throw new ConversionError(
        'Invalid JSON format',
        'INVALID_JSON',
        error
      );
    }

    // Determine format and convert
    if (data.object === 'page') {
      return this.importNotionPage(data);
    } else if (Array.isArray(data)) {
      return this.importNotionBlocks(data);
    } else if (data.type) {
      // Single Notion block
      return this.importNotionBlocks([data]);
    } else {
      throw new ConversionError(
        'Unrecognized Notion format',
        'INVALID_FORMAT'
      );
    }
  }

  private async importNotionPage(
    page: NotionPage
  ): Promise<ConvertedDocument> {
    const blocks: PortableTextBlock[] = [];

    // Extract title from properties
    const title = this.extractTitle(page.properties);
    if (title) {
      blocks.push(createTextBlock(title, 'h1'));
    }

    // Convert children blocks
    if (page.children) {
      for (const block of page.children) {
        const converted = this.convertBlock(block);
        if (converted) {
          if (Array.isArray(converted)) {
            blocks.push(...converted);
          } else {
            blocks.push(converted);
          }
        }
      }
    }

    return {
      content: blocks,
      metadata: createMetadata({
        source: 'notion',
        sourceId: page.id,
        title,
        createdAt: (page as any).created_time,
        updatedAt: (page as any).last_edited_time,
      }),
    };
  }

  private async importNotionBlocks(
    blocks: NotionBlock[]
  ): Promise<ConvertedDocument> {
    const portableBlocks: PortableTextBlock[] = [];

    for (const block of blocks) {
      const converted = this.convertBlock(block);
      if (converted) {
        if (Array.isArray(converted)) {
          portableBlocks.push(...converted);
        } else {
          portableBlocks.push(converted);
        }
      }
    }

    return {
      content: portableBlocks,
      metadata: createMetadata({
        source: 'notion',
      }),
    };
  }

  private convertBlock(
    block: NotionBlock
  ): PortableTextBlock | PortableTextBlock[] | null {
    const type = block.type;
    const content = (block as any)[type];

    if (!content) {
      return null;
    }

    switch (type) {
      case 'paragraph':
        return this.convertParagraph(content);
      case 'heading_1':
        return this.convertHeading(content, 'h1');
      case 'heading_2':
        return this.convertHeading(content, 'h2');
      case 'heading_3':
        return this.convertHeading(content, 'h3');
      case 'bulleted_list_item':
        return this.convertListItem(content, 'bullet');
      case 'numbered_list_item':
        return this.convertListItem(content, 'number');
      case 'to_do':
        return this.convertTodo(content);
      case 'toggle':
        return this.convertToggle(content);
      case 'code':
        return this.convertCode(content);
      case 'quote':
        return this.convertQuote(content);
      case 'callout':
        return this.convertCallout(content);
      case 'divider':
        return createTextBlock('---', 'normal');
      case 'image':
        return this.convertImage(content);
      case 'table':
        return this.convertTable(content);
      case 'bookmark':
        return this.convertBookmark(content);
      default:
        // Fallback for unknown types
        if (content.rich_text) {
          return this.convertParagraph(content);
        }
        return null;
    }
  }

  private convertParagraph(content: any): PortableTextBlock {
    const children = this.convertRichText(content.rich_text || []);

    return {
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      children: children.length > 0 ? children : [createSpan('')],
      markDefs: [],
    };
  }

  private convertHeading(
    content: any,
    level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  ): PortableTextBlock {
    const children = this.convertRichText(content.rich_text || []);

    return {
      _type: 'block',
      _key: generateKey(),
      style: level,
      children: children.length > 0 ? children : [createSpan('')],
      markDefs: [],
    };
  }

  private convertListItem(
    content: any,
    listType: 'bullet' | 'number'
  ): PortableTextBlock {
    const children = this.convertRichText(content.rich_text || []);

    return {
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      listItem: listType,
      level: 1,
      children: children.length > 0 ? children : [createSpan('')],
      markDefs: [],
    };
  }

  private convertTodo(content: any): PortableTextBlock {
    const children = this.convertRichText(content.rich_text || []);
    const checked = content.checked ? '[x] ' : '[ ] ';

    return {
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [createSpan(checked), ...children],
      markDefs: [],
    };
  }

  private convertToggle(content: any): PortableTextBlock {
    // Treat toggles as regular paragraphs
    return this.convertParagraph(content);
  }

  private convertCode(content: any): PortableTextBlock {
    const code = this.extractPlainText(content.rich_text || []);
    return createCodeBlock(code, content.language);
  }

  private convertQuote(content: any): PortableTextBlock {
    const children = this.convertRichText(content.rich_text || []);

    return {
      _type: 'block',
      _key: generateKey(),
      style: 'blockquote',
      children: children.length > 0 ? children : [createSpan('')],
      markDefs: [],
    };
  }

  private convertCallout(content: any): PortableTextBlock {
    const text = this.extractPlainText(content.rich_text || []);
    return createCalloutBlock(text, 'info');
  }

  private convertImage(content: any): PortableTextBlock {
    const url = content.external?.url || content.file?.url || '';
    const caption = content.caption
      ? this.extractPlainText(content.caption)
      : undefined;

    return createImageBlock(url, caption, caption);
  }

  private convertTable(content: any): any {
    // Notion tables require fetching child blocks
    // For now, create a placeholder
    const width = content.table_width || 0;
    return createTableBlock([
      { cells: Array(width).fill(''), header: true },
    ]);
  }

  private convertBookmark(content: any): PortableTextBlock {
    const url = content.url || '';
    return createTextBlock(`[Bookmark: ${url}]`, 'normal');
  }

  private convertRichText(richText: any[]): PortableTextSpan[] {
    const spans: PortableTextSpan[] = [];
    const markDefs: any[] = [];

    for (const text of richText) {
      const marks: string[] = [];

      // Add formatting marks
      if (text.annotations) {
        if (text.annotations.bold) marks.push('strong');
        if (text.annotations.italic) marks.push('em');
        if (text.annotations.strikethrough) marks.push('strike');
        if (text.annotations.code) marks.push('code');
        if (text.annotations.underline) marks.push('underline');
      }

      // Handle links
      if (text.href) {
        const markKey = generateKey();
        markDefs.push({
          _type: 'link',
          _key: markKey,
          href: text.href,
        });
        marks.push(markKey);
      }

      spans.push(createSpan(text.plain_text || text.text?.content || '', marks));
    }

    return spans;
  }

  private extractPlainText(richText: any[]): string {
    return richText
      .map((text) => text.plain_text || text.text?.content || '')
      .join('');
  }

  private extractTitle(properties: Record<string, any>): string | undefined {
    // Look for title property
    for (const [_key, value] of Object.entries(properties)) {
      if (value.type === 'title' && value.title) {
        return this.extractPlainText(value.title);
      }
    }
    return undefined;
  }
}
