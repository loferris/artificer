/**
 * HTML exporter for preview and web publishing
 */

import type {
  ExporterPlugin,
  ConvertedDocument,
  ExportOptions,
} from '../types/index.js';
import type { PortableTextSpan } from '@portabletext/types';

export interface HtmlExportOptions extends ExportOptions {
  includeStyles?: boolean;
  includeMetadata?: boolean;
  className?: string;
  title?: string;
}

export class HtmlExporter implements ExporterPlugin {
  name = 'html';
  targetFormat = 'html';

  async export(
    document: ConvertedDocument,
    options?: HtmlExportOptions
  ): Promise<string> {
    const includeStyles = options?.includeStyles !== false;
    const includeMetadata = options?.includeMetadata !== false;
    const className = options?.className || 'document-content';
    const title = options?.title || document.metadata?.title || 'Document';

    const bodyContent: string[] = [];

    // Add metadata if requested
    if (includeMetadata && document.metadata) {
      const metadataHtml = this.generateMetadata(document.metadata);
      if (metadataHtml) {
        bodyContent.push(metadataHtml);
      }
    }

    // Convert blocks
    for (const block of document.content) {
      const html = this.convertBlock(block);
      if (html) {
        bodyContent.push(html);
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>${includeStyles ? `
  <style>${this.getDefaultStyles()}</style>` : ''}
</head>
<body>
  <div class="${className}">
${bodyContent.join('\n')}
  </div>
</body>
</html>`;
  }

  private generateMetadata(metadata: Record<string, any>): string {
    const parts: string[] = ['<div class="document-metadata">'];

    if (metadata.title) {
      parts.push(`  <h1>${this.escapeHtml(metadata.title)}</h1>`);
    }

    const metaItems: string[] = [];

    if (metadata.createdAt) {
      metaItems.push(`<span class="meta-date">Created: ${new Date(metadata.createdAt).toLocaleDateString()}</span>`);
    }

    if (metadata.updatedAt) {
      metaItems.push(`<span class="meta-date">Updated: ${new Date(metadata.updatedAt).toLocaleDateString()}</span>`);
    }

    if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
      const tagHtml = metadata.tags.map((tag: string) =>
        `<span class="tag">${this.escapeHtml(tag)}</span>`
      ).join(' ');
      metaItems.push(`<div class="tags">${tagHtml}</div>`);
    }

    if (metaItems.length > 0) {
      parts.push('  <div class="meta-info">');
      parts.push('    ' + metaItems.join(' '));
      parts.push('  </div>');
    }

    parts.push('</div>');
    return parts.join('\n');
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
      return `    <h${level}>${text}</h${level}>`;
    }

    if (block.style === 'blockquote') {
      return `    <blockquote>${text}</blockquote>`;
    }

    // Handle list items
    if (block.listItem) {
      const indent = '  '.repeat((block.level || 1));
      const tag = block.listItem === 'number' ? 'ol' : 'ul';
      return `${indent}<${tag}><li>${text}</li></${tag}>`;
    }

    // Regular paragraph
    return `    <p>${text}</p>`;
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

        let text = this.escapeHtml(span.text);
        const marks = span.marks || [];

        // Apply marks in reverse order (innermost first)
        const sortedMarks = [...marks].reverse();

        for (const mark of sortedMarks) {
          // Check if it's a mark definition reference
          const markDef = markDefs.find((def) => def._key === mark);

          if (markDef) {
            if (markDef._type === 'link') {
              const href = this.escapeHtml(markDef.href);
              const title = markDef.title ? ` title="${this.escapeHtml(markDef.title)}"` : '';
              text = `<a href="${href}"${title}>${text}</a>`;
            } else if (markDef._type === 'wikiLink') {
              const target = this.escapeHtml(markDef.target);
              text = `<a href="#${this.slugify(target)}" class="wiki-link">${text}</a>`;
            }
          } else {
            // Simple text formatting
            switch (mark) {
              case 'strong':
                text = `<strong>${text}</strong>`;
                break;
              case 'em':
                text = `<em>${text}</em>`;
                break;
              case 'code':
                text = `<code>${text}</code>`;
                break;
              case 'strike':
                text = `<del>${text}</del>`;
                break;
              case 'underline':
                text = `<u>${text}</u>`;
                break;
              case 'highlight':
                text = `<mark>${text}</mark>`;
                break;
            }
          }
        }

        return text;
      })
      .join('');
  }

  private convertCodeBlock(block: any): string {
    const language = block.language ? ` class="language-${this.escapeHtml(block.language)}"` : '';
    const code = this.escapeHtml(block.code || '');
    return `    <pre><code${language}>${code}</code></pre>`;
  }

  private convertImageBlock(block: any): string {
    const alt = this.escapeHtml(block.alt || '');
    const url = this.escapeHtml(block.url || '');
    const caption = block.caption;

    let html = `    <figure>
      <img src="${url}" alt="${alt}">`;

    if (caption) {
      html += `\n      <figcaption>${this.escapeHtml(caption)}</figcaption>`;
    }

    html += '\n    </figure>';
    return html;
  }

  private convertTableBlock(block: any): string {
    if (!block.rows || block.rows.length === 0) {
      return '';
    }

    const rows: string[] = ['    <table>'];

    for (let i = 0; i < block.rows.length; i++) {
      const row = block.rows[i];
      const cells = row.cells || [];
      const tag = (i === 0 || row.header) ? 'th' : 'td';

      rows.push('      <tr>');
      for (const cell of cells) {
        rows.push(`        <${tag}>${this.escapeHtml(cell)}</${tag}>`);
      }
      rows.push('      </tr>');
    }

    rows.push('    </table>');
    return rows.join('\n');
  }

  private convertCalloutBlock(block: any): string {
    const type = block.calloutType || 'note';
    const text = this.convertSpans(block.children || [], []);

    return `    <div class="callout callout-${type}">
      <div class="callout-title">${this.getCalloutTitle(type)}</div>
      <div class="callout-content">${text}</div>
    </div>`;
  }

  private getCalloutTitle(type: string): string {
    const titles: Record<string, string> = {
      note: '📝 Note',
      info: 'ℹ️ Info',
      warning: '⚠️ Warning',
      error: '❌ Error',
      success: '✅ Success',
    };
    return titles[type] || '📝 Note';
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'`/]/g, (char) => map[char] || char);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  private getDefaultStyles(): string {
    return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #fff;
    }

    .document-content {
      font-size: 16px;
    }

    .document-metadata {
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
    }

    .document-metadata h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      font-weight: 700;
      color: #111;
    }

    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .tags {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .tag {
      background: #e5e7eb;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: #374151;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
      line-height: 1.25;
      color: #111;
    }

    h1 { font-size: 2.25rem; }
    h2 { font-size: 1.875rem; }
    h3 { font-size: 1.5rem; }
    h4 { font-size: 1.25rem; }
    h5 { font-size: 1.125rem; }
    h6 { font-size: 1rem; }

    p {
      margin-bottom: 1rem;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    a.wiki-link {
      color: #7c3aed;
    }

    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.875em;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    }

    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1rem 0;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      font-size: 0.875rem;
    }

    blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #6b7280;
      font-style: italic;
    }

    ul, ol {
      margin: 1rem 0;
      padding-left: 2rem;
    }

    li {
      margin: 0.5rem 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.75rem;
      text-align: left;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
    }

    figure {
      margin: 1.5rem 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
    }

    figcaption {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      font-style: italic;
    }

    .callout {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .callout-note {
      background: #eff6ff;
      border-color: #2563eb;
    }

    .callout-info {
      background: #ecfeff;
      border-color: #06b6d4;
    }

    .callout-warning {
      background: #fef3c7;
      border-color: #f59e0b;
    }

    .callout-error {
      background: #fee2e2;
      border-color: #ef4444;
    }

    .callout-success {
      background: #d1fae5;
      border-color: #10b981;
    }

    .callout-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    del {
      text-decoration: line-through;
      color: #6b7280;
    }

    mark {
      background: #fef08a;
      padding: 0.1em 0.2em;
    }

    @media (max-width: 640px) {
      body {
        padding: 1rem;
      }

      .document-metadata h1 {
        font-size: 1.875rem;
      }

      h1 { font-size: 1.875rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; }
    }
    `;
  }
}
