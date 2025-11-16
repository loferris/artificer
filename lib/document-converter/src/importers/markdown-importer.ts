/**
 * Markdown importer with Obsidian support
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import yaml from 'js-yaml';
import type { Root, Content, PhrasingContent, Text } from 'mdast';
import type {
  ImporterPlugin,
  ConvertedDocument,
  ImportOptions,
  ObsidianFrontmatter,
} from '../types/index.js';
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
} from '../core/portable-text-utils.js';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

export class MarkdownImporter implements ImporterPlugin {
  name = 'markdown';
  supportedFormats = ['md', 'markdown', 'mdx'];

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
    _options?: ImportOptions
  ): Promise<ConvertedDocument> {
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

    for (const node of tree.children) {
      if (node.type === 'yaml') {
        // Skip frontmatter nodes
        continue;
      }

      const converted = this.convertNode(node);
      if (converted) {
        if (Array.isArray(converted)) {
          blocks.push(...converted);
        } else {
          blocks.push(converted);
        }
      }
    }

    return {
      content: blocks,
      metadata: createMetadata({
        source: 'markdown',
        ...frontmatter,
      }),
    };
  }

  private extractFrontmatter(tree: Root): Partial<ObsidianFrontmatter> {
    let frontmatter: Partial<ObsidianFrontmatter> = {};

    visit(tree, 'yaml', (node: any) => {
      try {
        // Use proper YAML parsing
        const parsed = yaml.load(node.value) as Record<string, any>;

        if (parsed && typeof parsed === 'object') {
          // Handle tags specially - ensure it's an array
          if (parsed.tags) {
            if (Array.isArray(parsed.tags)) {
              frontmatter.tags = parsed.tags.map(String);
            } else if (typeof parsed.tags === 'string') {
              // Support comma-separated tags
              frontmatter.tags = parsed.tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean);
            }
          }

          // Copy other fields
          Object.keys(parsed).forEach((key) => {
            if (key !== 'tags') {
              (frontmatter as any)[key] = parsed[key];
            }
          });
        }
      } catch (error) {
        // Ignore frontmatter parsing errors but log for debugging
        console.warn('Failed to parse YAML frontmatter:', error);
      }
    });

    return frontmatter;
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
    const markDefs: any[] = [];
    const children = this.convertInlineNodes(node.children, markDefs);

    return {
      _type: 'block',
      _key: generateKey(),
      style,
      children,
      markDefs,
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
        return createCalloutBlock(
          text + this.extractTextFromNodes(node.children.slice(1)),
          type as any
        );
      }
    }

    const markDefs: any[] = [];
    const children = this.convertInlineNodes(node.children, markDefs);

    return {
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      children,
      markDefs,
    };
  }

  private convertCode(node: any): PortableTextBlock {
    return createCodeBlock(node.value, node.lang, node.meta);
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
          // Handle wiki links in the result
          for (const span of result) {
            if ((span as any)._wikiLink) {
              const wikiInfo = (span as any)._wikiLink;
              // Add wiki link to markDefs
              markDefs.push({
                _type: 'wikiLink',
                _key: wikiInfo.markKey,
                target: wikiInfo.target,
                alias: wikiInfo.alias,
              });
              // Remove temporary property
              delete (span as any)._wikiLink;
            }
            spans.push(span);
          }
        } else {
          if ((result as any)._wikiLink) {
            const wikiInfo = (result as any)._wikiLink;
            markDefs.push({
              _type: 'wikiLink',
              _key: wikiInfo.markKey,
              target: wikiInfo.target,
              alias: wikiInfo.alias,
            });
            delete (result as any)._wikiLink;
          }
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
        return this.convertText(node);
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

  private convertText(node: Text): PortableTextSpan | PortableTextSpan[] {
    // Check for Obsidian wiki links [[Page Name]] or [[Page Name|Alias]]
    const wikiLinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const text = node.value;

    // Check if text contains wiki links
    if (wikiLinkPattern.test(text)) {
      return this.convertTextWithWikiLinks(text);
    }

    return createSpan(text);
  }

  private convertTextWithWikiLinks(text: string): PortableTextSpan[] {
    const wikiLinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const spans: PortableTextSpan[] = [];
    const markDefs: any[] = [];
    let lastIndex = 0;

    // Find all wiki links
    let match;
    wikiLinkPattern.lastIndex = 0; // Reset regex state
    while ((match = wikiLinkPattern.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        spans.push(createSpan(text.slice(lastIndex, match.index)));
      }

      // Add wiki link as a span with mark
      const [, target, alias] = match;
      const markKey = generateKey();

      // Store mark definition (will be handled by calling function)
      spans.push({
        _type: 'span',
        _key: generateKey(),
        text: alias || target,
        marks: [markKey],
        // Store wiki link info temporarily
        _wikiLink: { target, alias, markKey },
      } as any);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      spans.push(createSpan(text.slice(lastIndex)));
    }

    return spans;
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
