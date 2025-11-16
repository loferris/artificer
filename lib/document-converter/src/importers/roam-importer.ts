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
} from '../types/index.js';
import { ConversionError } from '../types/index.js';
import {
  createTextBlock,
  createSpan,
  createCodeBlock,
  createImageBlock,
  generateKey,
  createMetadata,
} from '../core/portable-text-utils.js';
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
    options?: ImportOptions
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
      return this.importRoamPage(data[0], options);
    } else {
      return this.importRoamPage(data, options);
    }
  }

  private async importRoamPage(
    page: RoamPage,
    options?: ImportOptions
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
      const children = this.parseInlineText(text);
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style,
        children,
        markDefs: [],
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
    const children = this.parseInlineText(text);

    // Determine if it's a list item based on nesting
    if (level > 1 || text.match(/^[\-\*]\s/)) {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'bullet',
        level: Math.max(1, level - 1),
        children,
        markDefs: [],
      });
    } else {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children,
        markDefs: [],
      });
    }

    return blocks;
  }

  private parseInlineText(text: string): PortableTextSpan[] {
    const spans: PortableTextSpan[] = [];
    const markDefs: any[] = [];

    // Simple regex-based parsing
    let currentPos = 0;
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, mark: 'strong' }, // Bold
      { regex: /__(.+?)__/g, mark: 'strong' }, // Bold alternative
      { regex: /\*(.+?)\*/g, mark: 'em' }, // Italic
      { regex: /_(.+?)_/g, mark: 'em' }, // Italic alternative
      { regex: /~~(.+?)~~/g, mark: 'strike' }, // Strikethrough
      { regex: /`(.+?)`/g, mark: 'code' }, // Inline code
      { regex: /\^\^(.+?)\^\^/g, mark: 'highlight' }, // Highlight
    ];

    // For simplicity, we'll process the text as-is and handle basic formatting
    // A more robust solution would use a proper parser

    // Handle Roam-style links: [[Page Name]]
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;

    const processedText = text.replace(linkPattern, (match, linkText) => {
      // Convert to wiki link mark
      return linkText; // Simplified - in production, handle as proper mark
    });

    // Handle markdown links: [text](url)
    const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const segments: Array<{ text: string; marks: string[]; href?: string }> = [];
    let remaining = processedText;
    let mdMatch;

    while ((mdMatch = mdLinkPattern.exec(processedText)) !== null) {
      const beforeLink = processedText.substring(lastIndex, mdMatch.index);
      if (beforeLink) {
        segments.push({ text: beforeLink, marks: [] });
      }

      const markKey = generateKey();
      markDefs.push({
        _type: 'link',
        _key: markKey,
        href: mdMatch[2],
      });
      segments.push({ text: mdMatch[1], marks: [markKey] });

      lastIndex = mdMatch.index + mdMatch[0].length;
    }

    // Add remaining text
    if (lastIndex < processedText.length) {
      segments.push({ text: processedText.substring(lastIndex), marks: [] });
    }

    // If no segments, just create a simple span
    if (segments.length === 0) {
      segments.push({ text: processedText, marks: [] });
    }

    // Convert segments to spans, applying marks
    for (const segment of segments) {
      let segmentText = segment.text;
      const baseMar = segment.marks;

      // Apply formatting marks
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex);
        if (regex.test(segmentText)) {
          // For simplicity, just strip the markers and add the mark
          // A proper implementation would split into multiple spans
          segmentText = segmentText.replace(regex, '$1');
          segment.marks.push(pattern.mark);
        }
      }

      spans.push(createSpan(segmentText, segment.marks));
    }

    return spans.length > 0 ? spans : [createSpan(text)];
  }
}
