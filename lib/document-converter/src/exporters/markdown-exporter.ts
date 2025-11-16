/**
 * Markdown exporter with Obsidian compatibility
 */

import type {
  ExporterPlugin,
  ConvertedDocument,
  ExportOptions,
} from '../types/index.js';
import type { PortableTextSpan } from '@portabletext/types';

export class MarkdownExporter implements ExporterPlugin {
  name = 'markdown';
  targetFormat = 'markdown';

  async export(
    document: ConvertedDocument,
    options?: ExportOptions
  ): Promise<string> {
    const parts: string[] = [];

    // Add frontmatter if metadata exists and includeMetadata is true
    if (options?.includeMetadata && document.metadata) {
      const frontmatter = this.generateFrontmatter(document.metadata);
      if (frontmatter) {
        parts.push(frontmatter);
        parts.push('');
      }
    }

    // Convert each block
    for (const block of document.content) {
      const markdown = this.convertBlock(block);
      if (markdown) {
        parts.push(markdown);
      }
    }

    return parts.join('\n');
  }

  private generateFrontmatter(metadata: Record<string, any>): string {
    const lines: string[] = ['---'];

    if (metadata.title) {
      lines.push(`title: ${metadata.title}`);
    }

    if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
      lines.push(`tags: ${metadata.tags.join(', ')}`);
    }

    if (metadata.createdAt) {
      lines.push(`created: ${metadata.createdAt}`);
    }

    if (metadata.updatedAt) {
      lines.push(`updated: ${metadata.updatedAt}`);
    }

    // Add other metadata fields
    for (const [key, value] of Object.entries(metadata)) {
      if (!['title', 'tags', 'createdAt', 'updatedAt', 'source', 'sourceId'].includes(key)) {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push('---');
    return lines.join('\n');
  }

  private convertBlock(block: any): string {
    switch (block._type) {
      case 'block':
        return this.convertTextBlock(block);
      case 'code':
        return this.convertCodeBlock(block);
      case 'image':
        return this.convertImageBlock(block);
      case 'table':
        return this.convertTableBlock(block);
      case 'callout':
        return this.convertCalloutBlock(block);
      default:
        return '';
    }
  }

  private convertTextBlock(block: any): string {
    const text = this.convertSpans(block.children || [], block.markDefs || []);

    // Handle different styles
    if (block.style?.startsWith('h')) {
      const level = parseInt(block.style.substring(1), 10);
      return '#'.repeat(level) + ' ' + text;
    }

    if (block.style === 'blockquote') {
      return '> ' + text;
    }

    // Handle list items
    if (block.listItem) {
      const indent = '  '.repeat((block.level || 1) - 1);
      const marker = block.listItem === 'number' ? '1.' : '-';
      return indent + marker + ' ' + text;
    }

    // Regular paragraph
    return text;
  }

  private convertSpans(
    spans: PortableTextSpan[],
    markDefs: any[]
  ): string {
    return spans
      .map((span) => {
        if (!('text' in span)) {
          return '';
        }

        let text = span.text;
        const marks = span.marks || [];

        // Apply marks in reverse order (innermost first)
        const sortedMarks = [...marks].reverse();

        for (const mark of sortedMarks) {
          // Check if it's a mark definition reference
          const markDef = markDefs.find((def) => def._key === mark);

          if (markDef) {
            if (markDef._type === 'link') {
              text = `[${text}](${markDef.href}${markDef.title ? ` "${markDef.title}"` : ''})`;
            } else if (markDef._type === 'wikiLink') {
              text = `[[${markDef.target}${markDef.alias ? `|${markDef.alias}` : ''}]]`;
            }
          } else {
            // Simple text formatting
            switch (mark) {
              case 'strong':
                text = `**${text}**`;
                break;
              case 'em':
                text = `*${text}*`;
                break;
              case 'code':
                text = `\`${text}\``;
                break;
              case 'strike':
                text = `~~${text}~~`;
                break;
              case 'underline':
                text = `<u>${text}</u>`;
                break;
              case 'highlight':
                text = `==${text}==`;
                break;
            }
          }
        }

        return text;
      })
      .join('');
  }

  private convertCodeBlock(block: any): string {
    const language = block.language || '';
    const code = block.code || '';
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  private convertImageBlock(block: any): string {
    const alt = block.alt || '';
    const url = block.url || '';
    const caption = block.caption;

    let markdown = `![${alt}](${url})`;

    if (caption) {
      markdown += `\n*${caption}*`;
    }

    return markdown;
  }

  private convertTableBlock(block: any): string {
    if (!block.rows || block.rows.length === 0) {
      return '';
    }

    const lines: string[] = [];

    for (let i = 0; i < block.rows.length; i++) {
      const row = block.rows[i];
      const cells = row.cells || [];

      // Create table row
      lines.push('| ' + cells.join(' | ') + ' |');

      // Add separator after header row
      if (i === 0 || row.header) {
        lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
      }
    }

    return lines.join('\n');
  }

  private convertCalloutBlock(block: any): string {
    const type = block.calloutType || 'note';
    const text = this.convertSpans(block.children || [], block.markDefs || []);

    // Obsidian-style callout
    return `> [!${type}]\n> ${text}`;
  }
}
