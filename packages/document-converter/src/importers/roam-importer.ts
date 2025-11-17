/**
 * Roam Research JSON importer
 * Supports Roam export format (.json)
 */

import type {
  ImporterPlugin,
  ConvertedDocument,
  ImportOptions,
  RoamBlock,
  RoamPage,
} from '../types/index';
import { ConversionError } from '../types/index';
import {
  createTextBlock,
  createSpan,
  createCodeBlock,
  createImageBlock,
  generateKey,
  createMetadata,
} from '../core/portable-text-utils';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

export class RoamImporter implements ImporterPlugin {
  name = 'roam';
  supportedFormats = ['json'];

  detect(input: string | Buffer): boolean {
    try {
      const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;
      const data = JSON.parse(content);

      // Check for Roam-specific structure
      if (Array.isArray(data)) {
        return data.some(
          (item: any) =>
            item.title !== undefined &&
            (item.children !== undefined || item['create-time'] !== undefined)
        );
      }

      return (
        data.title !== undefined &&
        (data.children !== undefined || data['create-time'] !== undefined)
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

    // Handle single page or array of pages
    if (Array.isArray(data)) {
      // Multiple pages - merge them or take the first
      if (data.length === 0) {
        throw new ConversionError(
          'Empty Roam export',
          'EMPTY_EXPORT'
        );
      }
      return this.importRoamPage(data[0]);
    } else {
      return this.importRoamPage(data);
    }
  }

  private async importRoamPage(
    page: RoamPage
  ): Promise<ConvertedDocument> {
    const blocks: PortableTextBlock[] = [];

    // Add title as H1
    if (page.title) {
      blocks.push(createTextBlock(page.title, 'h1'));
    }

    // Convert child blocks
    if (page.children) {
      for (const block of page.children) {
        const converted = this.convertBlock(block, 1);
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
        source: 'roam',
        title: page.title,
        createdAt: page['create-time']
          ? new Date(page['create-time']).toISOString()
          : undefined,
        updatedAt: page['edit-time']
          ? new Date(page['edit-time']).toISOString()
          : undefined,
      }),
    };
  }

  private convertBlock(
    block: RoamBlock,
    level: number = 1
  ): PortableTextBlock | PortableTextBlock[] | null {
    if (!block.string && !block.children) {
      return null;
    }

    const blocks: PortableTextBlock[] = [];

    // Parse the block string
    if (block.string) {
      const parsedBlocks = this.parseBlockString(block.string, block, level);
      blocks.push(...parsedBlocks);
    }

    // Handle nested children
    if (block.children) {
      for (const child of block.children) {
        const converted = this.convertBlock(child, level + 1);
        if (converted) {
          if (Array.isArray(converted)) {
            blocks.push(...converted);
          } else {
            blocks.push(converted);
          }
        }
      }
    }

    return blocks;
  }

  private parseBlockString(
    text: string,
    block: RoamBlock,
    level: number
  ): PortableTextBlock[] {
    const blocks: PortableTextBlock[] = [];

    // Check for heading
    if (block.heading) {
      const headingLevel = Math.min(block.heading, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const style = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      const { children, markDefs } = this.parseInlineText(text);
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style,
        children,
        markDefs,
      });
      return blocks;
    }

    // Check for code block (triple backticks)
    const codeBlockMatch = text.match(/^```(\w+)?\n([\s\S]*?)```$/);
    if (codeBlockMatch) {
      const [, language, code] = codeBlockMatch;
      blocks.push(createCodeBlock(code.trim(), language));
      return blocks;
    }

    // Check for image embed
    const imageMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const [, alt, url] = imageMatch;
      blocks.push(createImageBlock(url, alt));
      return blocks;
    }

    // Regular paragraph or list item
    const { children, markDefs } = this.parseInlineText(text);

    // Determine if it's a list item based on nesting
    if (level > 1 || text.match(/^[\-\*]\s/)) {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'bullet',
        level: Math.max(1, level - 1),
        children,
        markDefs,
      });
    } else {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children,
        markDefs,
      });
    }

    return blocks;
  }

  private parseInlineText(text: string): { children: PortableTextSpan[]; markDefs: any[] } {
    const spans: PortableTextSpan[] = [];
    const markDefs: any[] = [];

    // Remove TODO/DONE markers but preserve them in the text
    const todoMatch = text.match(/^{{(\[DONE\]|TODO)}}\s*/);
    let workingText = text;
    let todoPrefix = '';

    if (todoMatch) {
      todoPrefix = todoMatch[1] === 'TODO' ? '☐ ' : '☑ ';
      workingText = text.substring(todoMatch[0].length);
    }

    // Parse Roam-specific syntax
    const tokens = this.tokenizeRoamText(workingText);

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          spans.push(createSpan((todoPrefix || '') + token.value));
          todoPrefix = ''; // Only add once
          break;

        case 'page-reference': {
          const markKey = generateKey();
          markDefs.push({
            _type: 'wikiLink',
            _key: markKey,
            target: token.target,
            alias: token.alias,
          });
          spans.push(createSpan(token.display || token.target, [markKey]));
          break;
        }

        case 'block-reference': {
          const markKey = generateKey();
          markDefs.push({
            _type: 'blockReference',
            _key: markKey,
            blockUid: token.uid,
          });
          spans.push(createSpan(`((${token.uid}))`, [markKey]));
          break;
        }

        case 'attribute': {
          const markKey = generateKey();
          markDefs.push({
            _type: 'attribute',
            _key: markKey,
            name: token.name,
            value: token.value,
          });
          spans.push(createSpan(`${token.name}:: ${token.value}`, [markKey]));
          break;
        }

        case 'link': {
          const markKey = generateKey();
          markDefs.push({
            _type: 'link',
            _key: markKey,
            href: token.url,
          });
          spans.push(createSpan(token.text, [markKey]));
          break;
        }

        case 'bold':
          spans.push(createSpan(token.value, ['strong']));
          break;

        case 'italic':
          spans.push(createSpan(token.value, ['em']));
          break;

        case 'code':
          spans.push(createSpan(token.value, ['code']));
          break;

        case 'strikethrough':
          spans.push(createSpan(token.value, ['strike']));
          break;

        case 'highlight':
          spans.push(createSpan(token.value, ['highlight']));
          break;
      }
    }

    return {
      children: spans.length > 0 ? spans : [createSpan(text)],
      markDefs,
    };
  }

  private tokenizeRoamText(text: string): Array<any> {
    const tokens: any[] = [];
    let pos = 0;

    while (pos < text.length) {
      // Block reference: ((uid))
      const blockRefMatch = text.substring(pos).match(/^\(\(([a-zA-Z0-9_-]+)\)\)/);
      if (blockRefMatch) {
        tokens.push({
          type: 'block-reference',
          uid: blockRefMatch[1],
        });
        pos += blockRefMatch[0].length;
        continue;
      }

      // Page reference: [[Page Name]] or [[Page Name|Alias]]
      const pageRefMatch = text.substring(pos).match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (pageRefMatch) {
        tokens.push({
          type: 'page-reference',
          target: pageRefMatch[1],
          alias: pageRefMatch[2],
          display: pageRefMatch[2] || pageRefMatch[1],
        });
        pos += pageRefMatch[0].length;
        continue;
      }

      // Attribute: name:: value
      const attrMatch = text.substring(pos).match(/^([a-zA-Z][a-zA-Z0-9-]*)::\s*(.+?)(?=\s|$|\[\[|\(\()/);
      if (attrMatch && (pos === 0 || text[pos - 1] === ' ')) {
        tokens.push({
          type: 'attribute',
          name: attrMatch[1],
          value: attrMatch[2].trim(),
        });
        pos += attrMatch[0].length;
        continue;
      }

      // Markdown link: [text](url)
      const linkMatch = text.substring(pos).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          text: linkMatch[1],
          url: linkMatch[2],
        });
        pos += linkMatch[0].length;
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = text.substring(pos).match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        tokens.push({
          type: 'bold',
          value: boldMatch[2],
        });
        pos += boldMatch[0].length;
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = text.substring(pos).match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        tokens.push({
          type: 'italic',
          value: italicMatch[2],
        });
        pos += italicMatch[0].length;
        continue;
      }

      // Code: `text`
      const codeMatch = text.substring(pos).match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push({
          type: 'code',
          value: codeMatch[1],
        });
        pos += codeMatch[0].length;
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = text.substring(pos).match(/^~~(.+?)~~/);
      if (strikeMatch) {
        tokens.push({
          type: 'strikethrough',
          value: strikeMatch[1],
        });
        pos += strikeMatch[0].length;
        continue;
      }

      // Highlight: ^^text^^
      const highlightMatch = text.substring(pos).match(/^\^\^(.+?)\^\^/);
      if (highlightMatch) {
        tokens.push({
          type: 'highlight',
          value: highlightMatch[1],
        });
        pos += highlightMatch[0].length;
        continue;
      }

      // Regular text - consume until next special character
      const textMatch = text.substring(pos).match(/^([^*_`~^\[(]+)/);
      if (textMatch) {
        tokens.push({
          type: 'text',
          value: textMatch[1],
        });
        pos += textMatch[0].length;
      } else {
        // Single character that didn't match anything
        tokens.push({
          type: 'text',
          value: text[pos],
        });
        pos++;
      }
    }

    return tokens;
  }
}
