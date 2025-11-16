/**
 * Roam Research JSON exporter
 */

import type {
  ExporterPlugin,
  ConvertedDocument,
  ExportOptions,
} from '../types/index.js';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

export class RoamExporter implements ExporterPlugin {
  name = 'roam';
  targetFormat = 'roam';

  async export(
    document: ConvertedDocument,
    options?: ExportOptions
  ): Promise<string> {
    const title = document.metadata?.title || 'Untitled';
    const createTime = document.metadata?.createdAt
      ? new Date(document.metadata.createdAt).getTime()
      : Date.now();
    const editTime = document.metadata?.updatedAt
      ? new Date(document.metadata.updatedAt).getTime()
      : Date.now();

    const children: any[] = [];

    for (const block of document.content) {
      // Skip H1 if it matches the title
      if (
        block._type === 'block' &&
        (block as any).style === 'h1' &&
        this.extractText(block) === title
      ) {
        continue;
      }

      const converted = this.convertBlock(block);
      if (converted) {
        if (Array.isArray(converted)) {
          children.push(...converted);
        } else {
          children.push(converted);
        }
      }
    }

    const roamPage = {
      title,
      'create-time': createTime,
      'edit-time': editTime,
      children,
    };

    return JSON.stringify(
      roamPage,
      null,
      options?.prettyPrint ? 2 : undefined
    );
  }

  private convertBlock(block: PortableTextBlock): any | any[] | null {
    switch (block._type) {
      case 'block':
        return this.convertTextBlock(block);
      case 'code':
        return this.convertCodeBlock(block);
      case 'image':
        return this.convertImageBlock(block);
      case 'table':
        return this.convertTableBlock(block);
      default:
        return null;
    }
  }

  private convertTextBlock(block: any): any {
    const text = this.convertSpans(block.children || [], block.markDefs || []);

    const roamBlock: any = {
      string: text,
      'create-time': Date.now(),
      'edit-time': Date.now(),
      uid: this.generateUid(),
    };

    // Handle headings
    if (block.style?.startsWith('h')) {
      const level = parseInt(block.style.substring(1), 10);
      roamBlock.heading = level;
    }

    // Handle text alignment (if needed)
    if (block.style === 'blockquote') {
      // Roam doesn't have blockquotes, so we'll prefix with >
      roamBlock.string = '> ' + roamBlock.string;
    }

    return roamBlock;
  }

  private convertSpans(spans: PortableTextSpan[], markDefs: any[]): string {
    return spans
      .map((span) => {
        if (!('text' in span)) {
          return '';
        }

        let text = span.text;
        const marks = span.marks || [];

        // Apply marks
        for (const mark of marks) {
          const markDef = markDefs.find((def) => def._key === mark);

          if (markDef) {
            if (markDef._type === 'link') {
              text = `[${text}](${markDef.href})`;
            } else if (markDef._type === 'wikiLink') {
              text = `[[${markDef.target}]]`;
            }
          } else {
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
              case 'highlight':
                text = `^^${text}^^`;
                break;
            }
          }
        }

        return text;
      })
      .join('');
  }

  private convertCodeBlock(block: any): any {
    const code = block.code || '';
    const language = block.language || '';

    return {
      string: `\`\`\`${language}\n${code}\n\`\`\``,
      'create-time': Date.now(),
      'edit-time': Date.now(),
      uid: this.generateUid(),
    };
  }

  private convertImageBlock(block: any): any {
    const url = block.url || '';
    const alt = block.alt || '';

    return {
      string: `![${alt}](${url})`,
      'create-time': Date.now(),
      'edit-time': Date.now(),
      uid: this.generateUid(),
    };
  }

  private convertTableBlock(block: any): any[] {
    // Roam doesn't have native tables, so we'll represent as nested blocks
    const rows = block.rows || [];
    return rows.map((row: any) => ({
      string: row.cells.join(' | '),
      'create-time': Date.now(),
      'edit-time': Date.now(),
      uid: this.generateUid(),
    }));
  }

  private extractText(block: PortableTextBlock): string {
    if (block._type === 'block' && 'children' in block) {
      return (block.children as any[])
        .map((child) => {
          if ('text' in child) {
            return child.text;
          }
          return '';
        })
        .join('');
    }
    return '';
  }

  private generateUid(): string {
    // Generate a Roam-style UID (9 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = '';
    for (let i = 0; i < 9; i++) {
      uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
  }
}
