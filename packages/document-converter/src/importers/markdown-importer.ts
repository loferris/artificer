/**
 * Markdown importer with Obsidian support
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import YAML from 'yaml';
import type { Root, Content, PhrasingContent, Text } from 'mdast';
import type {
  ImporterPlugin,
  ConvertedDocument,
  ImportOptions,
  ObsidianFrontmatter,
} from '../types/index';
import {
  createTextBlock,
  createSpan,
  createCodeBlock,
  createImageBlock,
  createTableBlock,
  createCalloutBlock,
  generateKey,
  createMetadata,
  sanitizeText,
} from '../core/portable-text-utils';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

export class MarkdownImporter implements ImporterPlugin {
  name = 'markdown';
  supportedFormats = ['md', 'markdown', 'mdx'];
  private sourceMapEntries: any[] = [];
  private includeSourceMap = false;

  detect(input: string | Buffer): boolean {
    const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

    // Check for markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /^\*\*.*\*\*/m, // Bold
      /^\[.*\]\(.*\)/m, // Links
      /^```/m, // Code blocks
      /^\-\s+/m, // Lists
      /^\d+\.\s+/m, // Numbered lists
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
  }

  async import(
    input: string,
    options?: ImportOptions
  ): Promise<ConvertedDocument> {
    // Reset source map state
    this.sourceMapEntries = [];
    this.includeSourceMap = options?.includeSourceMap ?? false;

    const strictMode = options?.strictMode ?? true;
    const onError = options?.onError;
    const sanitized = sanitizeText(input);

    // Parse markdown to AST
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ['yaml']);

    const ast = processor.parse(sanitized);
    const tree = processor.runSync(ast) as Root;

    // Extract frontmatter
    const frontmatter = this.extractFrontmatter(tree);

    // Convert to Portable Text
    const blocks: PortableTextBlock[] = [];

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'yaml') {
        // Skip frontmatter nodes
        continue;
      }

      try {
        const converted = this.convertNode(node);
        if (converted) {
          if (Array.isArray(converted)) {
            blocks.push(...converted);
          } else {
            blocks.push(converted);
          }
        }
      } catch (error) {
        const conversionError = error instanceof Error ? error : new Error(String(error));

        if (strictMode) {
          // In strict mode, re-throw the error
          throw conversionError;
        } else {
          // In non-strict mode, call error handler and continue
          if (onError) {
            onError(conversionError, { blockIndex: i, block: node });
          }
          // Skip this block and continue
          continue;
        }
      }
    }

    const result: ConvertedDocument = {
      content: blocks,
      metadata: createMetadata({
        source: 'markdown',
        ...frontmatter,
      }),
    };

    // Add source map if requested
    if (this.includeSourceMap && this.sourceMapEntries.length > 0) {
      result.sourceMap = {
        version: 1,
        mappings: this.sourceMapEntries,
        sources: ['markdown'],
        sourcesContent: [input],
      };
    }

    return result;
  }

  private extractFrontmatter(tree: Root): Partial<ObsidianFrontmatter> {
    let frontmatter: Partial<ObsidianFrontmatter> = {};

    visit(tree, 'yaml', (node: any) => {
      try {
        const parsed = YAML.parse(node.value);
        if (parsed && typeof parsed === 'object') {
          // Merge parsed YAML into frontmatter
          Object.assign(frontmatter, parsed);

          // Normalize tags to array format
          if (frontmatter.tags !== undefined) {
            const tags: unknown = frontmatter.tags;
            if (typeof tags === 'string') {
              frontmatter.tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (!Array.isArray(tags)) {
              frontmatter.tags = [String(tags)];
            }
          }
        }
      } catch (error) {
        // Ignore frontmatter parsing errors but log for debugging
        console.warn('Failed to parse YAML frontmatter:', error);
      }
    });

    return frontmatter;
  }

  private recordSourceMap(blockKey: string, node: any): void {
    if (!this.includeSourceMap || !node.position) {
      return;
    }

    const pos = node.position;
    this.sourceMapEntries.push({
      blockKey,
      line: pos.start.line,
      column: pos.start.column - 1, // Convert to 0-indexed
      length: pos.end.offset - pos.start.offset,
      source: 'markdown',
      originalType: node.type,
    });
  }

  private convertNode(
    node: Content
  ): PortableTextBlock | PortableTextBlock[] | null {
    switch (node.type) {
      case 'heading':
        return this.convertHeading(node);
      case 'paragraph':
        return this.convertParagraph(node);
      case 'code':
        return this.convertCode(node);
      case 'list':
        return this.convertList(node);
      case 'blockquote':
        return this.convertBlockquote(node);
      case 'table':
        return this.convertTable(node);
      case 'thematicBreak':
        return createTextBlock('---', 'normal');
      case 'image':
        return this.convertImage(node);
      default:
        return null;
    }
  }

  private convertHeading(node: any): PortableTextBlock {
    const style = `h${node.depth}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    const children = this.convertInlineNodes(node.children);
    const key = generateKey();

    this.recordSourceMap(key, node);

    return {
      _type: 'block',
      _key: key,
      style,
      children,
      markDefs: [],
    };
  }

  private convertParagraph(node: any): PortableTextBlock {
    // Check for Obsidian callouts
    const firstChild = node.children[0];
    if (
      firstChild?.type === 'text' &&
      firstChild.value.match(/^\[!(note|info|warning|error|success)\]/)
    ) {
      const match = firstChild.value.match(/^\[!(note|info|warning|error|success)\]\s*(.*)$/);
      if (match) {
        const [, type, text] = match;
        const block = createCalloutBlock(
          text + this.extractTextFromNodes(node.children.slice(1)),
          type as any
        );
        this.recordSourceMap(block._key, node);
        return block;
      }
    }

    const children = this.convertInlineNodes(node.children);
    const key = generateKey();

    this.recordSourceMap(key, node);

    return {
      _type: 'block',
      _key: key,
      style: 'normal',
      children,
      markDefs: [],
    };
  }

  private convertCode(node: any): PortableTextBlock {
    const block = createCodeBlock(node.value, node.lang, node.meta);
    this.recordSourceMap(block._key, node);
    return block;
  }

  private convertList(node: any): PortableTextBlock[] {
    const listType = node.ordered ? 'number' : 'bullet';
    const blocks: PortableTextBlock[] = [];

    for (const item of node.children) {
      if (item.type === 'listItem') {
        blocks.push(...this.convertListItem(item, listType, 1));
      }
    }

    return blocks;
  }

  private convertListItem(
    node: any,
    listType: 'bullet' | 'number',
    level: number
  ): PortableTextBlock[] {
    const blocks: PortableTextBlock[] = [];

    for (const child of node.children) {
      if (child.type === 'paragraph') {
        const markDefs: any[] = [];
        const children = this.convertInlineNodes(child.children, markDefs);
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          listItem: listType,
          level,
          children,
          markDefs,
        });
      } else if (child.type === 'list') {
        // Nested list
        const nestedType = child.ordered ? 'number' : 'bullet';
        for (const nestedItem of child.children) {
          if (nestedItem.type === 'listItem') {
            blocks.push(...this.convertListItem(nestedItem, nestedType, level + 1));
          }
        }
      }
    }

    return blocks;
  }

  private convertBlockquote(node: any): PortableTextBlock[] {
    const blocks: PortableTextBlock[] = [];

    for (const child of node.children) {
      if (child.type === 'paragraph') {
        const markDefs: any[] = [];
        const children = this.convertInlineNodes(child.children, markDefs);
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'blockquote',
          children,
          markDefs,
        });
      }
    }

    return blocks;
  }

  private convertTable(node: any): PortableTextBlock {
    const rows = node.children.map((row: any, index: number) => ({
      cells: row.children.map((cell: any) =>
        this.extractTextFromNodes(cell.children)
      ),
      header: index === 0,
    }));

    return createTableBlock(rows);
  }

  private convertImage(node: any): PortableTextBlock {
    return createImageBlock(node.url, node.alt, node.title);
  }

  private convertInlineNodes(nodes: PhrasingContent[], markDefs: any[] = []): PortableTextSpan[] {
    const spans: PortableTextSpan[] = [];

    for (const node of nodes) {
      const result = this.convertInlineNode(node, markDefs);
      if (result) {
        if (Array.isArray(result)) {
          spans.push(...result);
        } else {
          spans.push(result);
        }
      }
    }

    return spans;
  }

  private convertInlineNode(
    node: PhrasingContent,
    markDefs: any[]
  ): PortableTextSpan | PortableTextSpan[] | null {
    switch (node.type) {
      case 'text':
        return this.convertText(node, markDefs);
      case 'strong':
        return this.convertWithMark(node.children, 'strong', markDefs);
      case 'emphasis':
        return this.convertWithMark(node.children, 'em', markDefs);
      case 'delete':
        return this.convertWithMark(node.children, 'strike', markDefs);
      case 'inlineCode':
        return createSpan(node.value, ['code']);
      case 'link':
        return this.convertLink(node, markDefs);
      case 'break':
        return createSpan('\n');
      default:
        return null;
    }
  }

  private convertText(node: Text, markDefs: any[]): PortableTextSpan | PortableTextSpan[] {
    // Check for Obsidian wiki links [[Page Name]] or [[Page Name|Alias]]
    const wikiLinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const text = node.value;

    // Check if text contains wiki links
    if (wikiLinkPattern.test(text)) {
      // Split text into spans with wiki links
      const spans: PortableTextSpan[] = [];
      let lastIndex = 0;
      wikiLinkPattern.lastIndex = 0; // Reset regex state

      let match;
      while ((match = wikiLinkPattern.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          spans.push(createSpan(text.substring(lastIndex, match.index)));
        }

        // Add wiki link
        const markKey = generateKey();
        markDefs.push({
          _type: 'wikiLink',
          _key: markKey,
          target: match[1],
          alias: match[2],
        });
        spans.push(createSpan(match[2] || match[1], [markKey]));

        lastIndex = wikiLinkPattern.lastIndex;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        spans.push(createSpan(text.substring(lastIndex)));
      }

      return spans;
    }

    return createSpan(text);
  }

  private convertWithMark(
    nodes: PhrasingContent[],
    mark: string,
    markDefs: any[]
  ): PortableTextSpan[] {
    const spans: PortableTextSpan[] = [];

    for (const node of nodes) {
      const result = this.convertInlineNode(node, markDefs);
      if (result) {
        const nodeSpans = Array.isArray(result) ? result : [result];
        for (const span of nodeSpans) {
          spans.push({
            ...span,
            marks: [...(span.marks || []), mark],
          });
        }
      }
    }

    return spans;
  }

  private convertLink(node: any, markDefs: any[]): PortableTextSpan[] {
    const markKey = generateKey();
    markDefs.push({
      _type: 'link',
      _key: markKey,
      href: node.url,
      title: node.title,
    });

    const spans: PortableTextSpan[] = [];
    for (const child of node.children) {
      const result = this.convertInlineNode(child, markDefs);
      if (result) {
        const nodeSpans = Array.isArray(result) ? result : [result];
        for (const span of nodeSpans) {
          spans.push({
            ...span,
            marks: [...(span.marks || []), markKey],
          });
        }
      }
    }

    return spans;
  }

  private extractTextFromNodes(nodes: any[]): string {
    return nodes
      .map((node) => {
        if (node.type === 'text') {
          return node.value;
        } else if (node.children) {
          return this.extractTextFromNodes(node.children);
        }
        return '';
      })
      .join('');
  }
}
