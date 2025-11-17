/**
 * Portable Text format adapter
 * Default adapter that uses Portable Text as the intermediate format
 */

import {
  BaseFormatAdapter,
  type BlockStyle,
  type ListType,
  type CalloutType,
} from '../core/format-adapter';

/**
 * Portable Text adapter implementation
 */
export class PortableTextAdapter extends BaseFormatAdapter {
  readonly name = 'portable-text';

  createTextBlock(
    children: any[],
    options?: {
      style?: BlockStyle;
      listItem?: ListType;
      level?: number;
      marks?: any[];
    }
  ): any {
    const block: any = {
      _type: 'block',
      _key: this.generateKey(),
      style: options?.style || 'normal',
      children,
      markDefs: options?.marks || [],
    };

    if (options?.listItem) {
      block.listItem = options.listItem;
      block.level = options.level || 1;
    }

    return block;
  }

  createSpan(text: string, marks: string[] = []): any {
    return {
      _type: 'span',
      _key: this.generateKey(),
      text,
      marks,
    };
  }

  createCodeBlock(code: string, language?: string, filename?: string): any {
    return {
      _type: 'code',
      _key: this.generateKey(),
      language,
      code,
      filename,
    };
  }

  createImageBlock(url: string, alt?: string, caption?: string): any {
    return {
      _type: 'image',
      _key: this.generateKey(),
      url,
      alt,
      caption,
    };
  }

  createTableBlock(rows: { cells: string[]; header?: boolean }[]): any {
    return {
      _type: 'table',
      _key: this.generateKey(),
      rows,
    };
  }

  createCalloutBlock(children: any[], type: CalloutType): any {
    return {
      _type: 'callout',
      _key: this.generateKey(),
      calloutType: type,
      children,
    };
  }

  createLinkMark(href: string, title?: string): { key: string; def: any } {
    const key = this.generateKey();
    return {
      key,
      def: {
        _type: 'link',
        _key: key,
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
        _type: 'wikiLink',
        _key: key,
        target,
        alias,
      },
    };
  }

  extractPlainText(blocks: any[]): string {
    return blocks
      .map((block) => {
        if (block._type === 'block' && 'children' in block) {
          return block.children
            .map((child: any) => {
              if ('text' in child) {
                return child.text;
              }
              return '';
            })
            .join('');
        } else if (block._type === 'code' && 'code' in block) {
          return block.code;
        }
        return '';
      })
      .join('\n');
  }

  getBlockType(block: any): string {
    return block._type || 'unknown';
  }

  hasChildren(block: any): boolean {
    return 'children' in block && Array.isArray(block.children);
  }

  getChildren(block: any): any[] {
    return block.children || [];
  }

  getSpanText(span: any): string {
    return span.text || '';
  }

  getSpanMarks(span: any): string[] {
    return span.marks || [];
  }

  getBlockStyle(block: any): BlockStyle | undefined {
    return block.style;
  }

  getListType(block: any): ListType | undefined {
    return block.listItem;
  }

  getListLevel(block: any): number | undefined {
    return block.level;
  }

  getMarkDefs(block: any): any[] {
    return block.markDefs || [];
  }

  getCode(block: any): string | undefined {
    return block.code;
  }

  getLanguage(block: any): string | undefined {
    return block.language;
  }

  getImageUrl(block: any): string | undefined {
    return block.url;
  }

  getImageAlt(block: any): string | undefined {
    return block.alt;
  }

  getTableRows(block: any): { cells: string[]; header?: boolean }[] | undefined {
    return block.rows;
  }

  getCalloutType(block: any): CalloutType | undefined {
    return block.calloutType;
  }
}

/**
 * Default singleton instance
 */
export const portableTextAdapter = new PortableTextAdapter();
