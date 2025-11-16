/**
 * Tests for DocumentConverter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentConverter, ConversionError } from '../index.js';

describe('DocumentConverter', () => {
  let converter: DocumentConverter;

  beforeEach(() => {
    converter = new DocumentConverter();
  });

  describe('Markdown Import/Export', () => {
    it('should import simple markdown', async () => {
      const markdown = `# Hello World\n\nThis is a **bold** statement.`;
      const doc = await converter.import(markdown);

      expect(doc.content).toBeDefined();
      expect(doc.content.length).toBeGreaterThan(0);
      expect(doc.metadata.source).toBe('markdown');
    });

    it('should handle markdown with frontmatter', async () => {
      const markdown = `---
title: Test Document
tags: test, markdown
---

# Content

This is the content.`;

      const doc = await converter.import(markdown);

      expect(doc.metadata.title).toBe('Test Document');
      expect(doc.metadata.tags).toContain('test');
    });

    it('should export to markdown', async () => {
      const markdown = `# Test\n\nHello world`;
      const doc = await converter.import(markdown);
      const exported = await converter.export(doc, 'markdown');

      expect(exported).toContain('# Test');
      expect(exported).toContain('Hello world');
    });

    it('should round-trip markdown', async () => {
      const original = `# Title\n\nParagraph with **bold** and *italic* text.\n\n- List item 1\n- List item 2`;
      const doc = await converter.import(original);
      const exported = await converter.export(doc, 'markdown');

      expect(exported).toContain('# Title');
      expect(exported).toContain('**bold**');
      expect(exported).toContain('*italic*');
      expect(exported).toContain('- List item 1');
    });
  });

  describe('Notion Import/Export', () => {
    it('should import Notion JSON', async () => {
      const notionJson = JSON.stringify({
        object: 'page',
        id: 'test-id',
        properties: {
          title: {
            type: 'title',
            title: [{ plain_text: 'Test Page' }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: 'Hello world' },
                  plain_text: 'Hello world',
                },
              ],
            },
          },
        ],
      });

      const doc = await converter.import(notionJson, { format: 'notion' });

      expect(doc.metadata.source).toBe('notion');
      expect(doc.metadata.title).toBe('Test Page');
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should export to Notion JSON', async () => {
      const markdown = `# Title\n\nParagraph text`;
      const doc = await converter.import(markdown);
      const exported = await converter.export(doc, 'notion');

      const parsed = JSON.parse(exported);
      expect(parsed.object).toBe('list');
      expect(parsed.results).toBeDefined();
    });

    it('should handle extended Notion block types', async () => {
      const notionJson = JSON.stringify({
        object: 'page',
        id: 'test-id',
        properties: {
          title: {
            type: 'title',
            title: [{ plain_text: 'Extended Blocks' }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'embed',
            embed: {
              url: 'https://www.youtube.com/watch?v=test',
            },
          },
          {
            object: 'block',
            type: 'video',
            video: {
              type: 'external',
              external: { url: 'https://example.com/video.mp4' },
            },
          },
          {
            object: 'block',
            type: 'file',
            file: {
              type: 'external',
              external: { url: 'https://example.com/doc.pdf' },
            },
          },
          {
            object: 'block',
            type: 'child_page',
            child_page: {
              title: 'Subpage',
            },
          },
          {
            object: 'block',
            type: 'table_of_contents',
            table_of_contents: {
              color: 'default',
            },
          },
        ],
      });

      const doc = await converter.import(notionJson, { format: 'notion' });

      // Check we imported all block types
      const blockTypes = new Set(doc.content.map((b: any) => b._type));
      expect(blockTypes.has('embed')).toBe(true);
      expect(blockTypes.has('video')).toBe(true);
      expect(blockTypes.has('file')).toBe(true);
      expect(blockTypes.has('childPage')).toBe(true);
      expect(blockTypes.has('tableOfContents')).toBe(true);

      // Export back to Notion
      const exported = await converter.export(doc, 'notion');
      const parsed = JSON.parse(exported);

      // Verify blocks were exported correctly
      const exportedTypes = new Set(parsed.results.map((b: any) => b.type));
      expect(exportedTypes.has('embed')).toBe(true);
      expect(exportedTypes.has('video')).toBe(true);
      expect(exportedTypes.has('file')).toBe(true);
      expect(exportedTypes.has('child_page')).toBe(true);
      expect(exportedTypes.has('table_of_contents')).toBe(true);
    });
  });

  describe('Roam Import/Export', () => {
    it('should import Roam JSON', async () => {
      const roamJson = JSON.stringify({
        title: 'Test Page',
        'create-time': Date.now(),
        'edit-time': Date.now(),
        children: [
          {
            string: 'First block',
            uid: 'abc123',
          },
          {
            string: 'Second block',
            uid: 'def456',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      expect(doc.metadata.source).toBe('roam');
      expect(doc.metadata.title).toBe('Test Page');
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should export to Roam JSON', async () => {
      const markdown = `# Title\n\nParagraph text`;
      const doc = await converter.import(markdown);
      const exported = await converter.export(doc, 'roam');

      const parsed = JSON.parse(exported);
      expect(parsed.title).toBeDefined();
      expect(parsed.children).toBeDefined();
    });

    it('should handle Roam page references', async () => {
      const roamJson = JSON.stringify({
        title: 'Test',
        children: [
          {
            string: 'This links to [[Another Page]] and [[Page|Alias]]',
            uid: 'test1',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      // Find blocks with wiki links (skip title, look for blocks with markDefs)
      const block = doc.content.find((b: any) => b.markDefs && b.markDefs.length > 0);
      expect(block).toBeDefined();

      // Should have spans with wiki link marks
      const children = (block as any).children;
      expect(children.length).toBeGreaterThan(0);

      // Check that we have wiki link marks
      const hasWikiLink = children.some((span: any) =>
        span.marks?.some((mark: string) => {
          const markDef = (block as any).markDefs?.find((def: any) => def._key === mark);
          return markDef?._type === 'wikiLink';
        })
      );
      expect(hasWikiLink).toBe(true);
    });

    it('should handle Roam block references', async () => {
      const roamJson = JSON.stringify({
        title: 'Test',
        children: [
          {
            string: 'Reference to ((block-uid-123)) here',
            uid: 'test2',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      const block = doc.content.find((b: any) => b.markDefs && b.markDefs.length > 0);
      expect(block).toBeDefined();

      const children = (block as any).children;
      const hasBlockRef = children.some((span: any) =>
        span.marks?.some((mark: string) => {
          const markDef = (block as any).markDefs?.find((def: any) => def._key === mark);
          return markDef?._type === 'blockReference' && markDef?.blockUid === 'block-uid-123';
        })
      );
      expect(hasBlockRef).toBe(true);
    });

    it('should handle Roam attributes', async () => {
      const roamJson = JSON.stringify({
        title: 'Test',
        children: [
          {
            string: 'author:: John Doe and status:: completed',
            uid: 'test3',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      const block = doc.content.find((b: any) => b.markDefs && b.markDefs.length > 0);
      expect(block).toBeDefined();

      const children = (block as any).children;
      const hasAttribute = children.some((span: any) =>
        span.marks?.some((mark: string) => {
          const markDef = (block as any).markDefs?.find((def: any) => def._key === mark);
          return markDef?._type === 'attribute' && markDef?.name === 'author';
        })
      );
      expect(hasAttribute).toBe(true);
    });

    it('should handle Roam TODO markers', async () => {
      const roamJson = JSON.stringify({
        title: 'Test',
        children: [
          {
            string: '{{TODO}} Task to do',
            uid: 'test4',
          },
          {
            string: '{{[DONE]}} Completed task',
            uid: 'test5',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      // Find blocks with TODO markers
      const todoBlock = doc.content.find((b: any) =>
        b.children?.some((span: any) => span.text?.includes('☐'))
      );
      expect(todoBlock).toBeDefined();

      const doneBlock = doc.content.find((b: any) =>
        b.children?.some((span: any) => span.text?.includes('☑'))
      );
      expect(doneBlock).toBeDefined();
    });

    it('should handle complex Roam formatting', async () => {
      const roamJson = JSON.stringify({
        title: 'Complex Test',
        children: [
          {
            string: '**Bold** and *italic* with `code` and ~~strike~~ and ^^highlight^^',
            uid: 'test6',
          },
        ],
      });

      const doc = await converter.import(roamJson, { format: 'roam' });

      const block = doc.content.find((b: any) => b.style !== 'h1' && b.children);
      expect(block).toBeDefined();

      const children = (block as any).children;

      // Check for formatting marks
      const marks = new Set(
        children.flatMap((span: any) => span.marks || [])
      );

      expect(marks.has('strong')).toBe(true);
      expect(marks.has('em')).toBe(true);
      expect(marks.has('code')).toBe(true);
      expect(marks.has('strike')).toBe(true);
      expect(marks.has('highlight')).toBe(true);
    });
  });

  describe('Format Conversion', () => {
    it('should convert markdown to Notion', async () => {
      const markdown = `# Test\n\n**Bold text** and *italic text*`;
      const notion = await converter.convert(markdown, 'notion', {
        sourceFormat: 'markdown',
      });

      expect(notion).toBeDefined();
      const parsed = JSON.parse(notion);
      expect(parsed.results).toBeDefined();
    });

    it('should convert Notion to markdown', async () => {
      const notionJson = JSON.stringify({
        object: 'page',
        id: 'test',
        properties: {
          title: {
            type: 'title',
            title: [{ plain_text: 'Test' }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'heading_1',
            heading_1: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: 'Title' },
                  plain_text: 'Title',
                },
              ],
            },
          },
        ],
      });

      const markdown = await converter.convert(notionJson, 'markdown', {
        sourceFormat: 'notion',
      });

      expect(markdown).toContain('# Title');
    });

    it('should convert Roam to markdown', async () => {
      const roamJson = JSON.stringify({
        title: 'Test',
        children: [
          {
            string: 'Hello **world**',
            uid: 'test123',
          },
        ],
      });

      const markdown = await converter.convert(roamJson, 'markdown', {
        sourceFormat: 'roam',
      });

      expect(markdown).toContain('# Test');
      expect(markdown).toContain('Hello');
      expect(markdown).toContain('world');
    });
  });

  describe('Plugin System', () => {
    it('should list available importers', () => {
      const importers = converter.listImporters();

      expect(importers).toContain('markdown');
      expect(importers).toContain('notion');
      expect(importers).toContain('roam');
    });

    it('should list available exporters', () => {
      const exporters = converter.listExporters();

      expect(exporters).toContain('markdown');
      expect(exporters).toContain('notion');
      expect(exporters).toContain('roam');
    });

    it('should prevent duplicate plugin registration by default', () => {
      const registry = converter.getRegistry();
      const mockPlugin = {
        name: 'test-importer',
        supportedFormats: ['test'],
        detect: () => false,
        import: async () => ({ content: [], metadata: {} }),
      };

      // First registration should succeed
      registry.registerImporter(mockPlugin);
      expect(registry.hasImporter('test-importer')).toBe(true);

      // Second registration should throw
      expect(() => {
        registry.registerImporter(mockPlugin);
      }).toThrow('already registered');

      // Cleanup
      registry.unregisterImporter('test-importer');
    });

    it('should allow plugin overwrite when specified', () => {
      const registry = converter.getRegistry();
      const mockPlugin1 = {
        name: 'test-importer-2',
        supportedFormats: ['test'],
        detect: () => false,
        import: async () => ({ content: [], metadata: { version: 1 } }),
      };

      const mockPlugin2 = {
        name: 'test-importer-2',
        supportedFormats: ['test'],
        detect: () => false,
        import: async () => ({ content: [], metadata: { version: 2 } }),
      };

      registry.registerImporter(mockPlugin1);

      // Should not throw when allowOverwrite is true
      expect(() => {
        registry.registerImporter(mockPlugin2, { allowOverwrite: true });
      }).not.toThrow();

      // Should get the new plugin
      const plugin = registry.getImporter('test-importer-2');
      expect(plugin).toBe(mockPlugin2);

      // Cleanup
      registry.unregisterImporter('test-importer-2');
    });

    it('should handle async concurrent registration safely', async () => {
      const registry = converter.getRegistry();

      const plugins = Array.from({ length: 5 }, (_, i) => ({
        name: `concurrent-${i}`,
        supportedFormats: ['test'],
        detect: () => false,
        import: async () => ({ content: [], metadata: { id: i } }),
      }));

      // Register all plugins concurrently
      await Promise.all(
        plugins.map(plugin => registry.registerImporterAsync(plugin))
      );

      // All plugins should be registered
      plugins.forEach(plugin => {
        expect(registry.hasImporter(plugin.name)).toBe(true);
      });

      // Cleanup
      plugins.forEach(plugin => registry.unregisterImporter(plugin.name));
    });

    it('should unregister plugins', () => {
      const registry = converter.getRegistry();
      const mockPlugin = {
        name: 'test-unregister',
        supportedFormats: ['test'],
        detect: () => false,
        import: async () => ({ content: [], metadata: {} }),
      };

      registry.registerImporter(mockPlugin);
      expect(registry.hasImporter('test-unregister')).toBe(true);

      const removed = registry.unregisterImporter('test-unregister');
      expect(removed).toBe(true);
      expect(registry.hasImporter('test-unregister')).toBe(false);

      // Trying to unregister again should return false
      const removedAgain = registry.unregisterImporter('test-unregister');
      expect(removedAgain).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      await expect(
        converter.import('not valid json', { format: 'notion' })
      ).rejects.toThrow();
    });

    it('should handle unknown format', async () => {
      const doc = await converter.import('# Test');
      await expect(
        converter.export(doc, 'unknown-format')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', async () => {
      const doc = await converter.import('', { format: 'markdown' });

      expect(doc.content).toBeDefined();
      expect(doc.content.length).toBe(0);
      expect(doc.metadata).toBeDefined();
    });

    it('should handle whitespace-only input', async () => {
      const doc = await converter.import('   \n\n  \t  \n  ', { format: 'markdown' });

      expect(doc.content).toBeDefined();
      expect(doc.content.length).toBe(0);
      expect(doc.metadata).toBeDefined();
    });

    it('should reject documents exceeding maxDocumentSize', async () => {
      const smallConverter = new DocumentConverter({
        maxDocumentSize: 100, // 100 bytes
      });

      // Create a document larger than 100 bytes with markdown syntax
      const largeDoc = '# ' + 'a'.repeat(200);

      await expect(
        smallConverter.import(largeDoc)
      ).rejects.toThrow('Document size');

      try {
        await smallConverter.import(largeDoc);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversionError);
        expect((error as ConversionError).code).toBe('DOCUMENT_TOO_LARGE');
      }
    });

    it('should allow documents under maxDocumentSize', async () => {
      const smallConverter = new DocumentConverter({
        maxDocumentSize: 1000,
      });

      const doc = await smallConverter.import('# Small Doc\n\nContent');

      expect(doc.content).toBeDefined();
    });

    it('should handle malformed frontmatter gracefully', async () => {
      const markdown = `---
title: Valid Title
tags: [unclosed array
invalid: yaml: syntax: here
---

# Content

This should still parse.`;

      const doc = await converter.import(markdown);

      // Should still parse the content even if frontmatter fails
      expect(doc.content.length).toBeGreaterThan(0);
      expect(doc.metadata.source).toBe('markdown');
    });

    it('should handle complex YAML frontmatter', async () => {
      const markdown = `---
title: Complex Document
tags:
  - tag1
  - tag2
  - tag3
nested:
  key: value
  deep:
    deeper: test
multi_line: |
  This is a
  multi-line
  value
---

# Content`;

      const doc = await converter.import(markdown);

      expect(doc.metadata.title).toBe('Complex Document');
      expect(doc.metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect((doc.metadata as any).nested?.key).toBe('value');
    });

    it('should reject documents exceeding maxBlocks', async () => {
      const smallConverter = new DocumentConverter({
        maxBlocks: 5,
      });

      // Create document with many blocks (paragraphs with markdown syntax)
      const manyParagraphs = Array(10)
        .fill(0)
        .map((_, i) => `**Paragraph ${i}**`)
        .join('\n\n');

      await expect(
        smallConverter.import(manyParagraphs)
      ).rejects.toThrow('blocks');

      try {
        await smallConverter.import(manyParagraphs);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversionError);
        expect((error as ConversionError).code).toBe('TOO_MANY_BLOCKS');
      }
    });

    it('should validate maxBlockDepth configuration', async () => {
      // Note: Markdown import doesn't naturally create deeply nested block.children arrays
      // (it only goes 1 level deep - blocks contain text spans as children).
      // This test verifies the configuration exists and works for normal markdown.
      const shallowConverter = new DocumentConverter({
        maxBlockDepth: 10,
      });

      const markdown = `# Header

- List 1
  - List 2
    - List 3

> Quote`;

      // Should succeed with reasonable depth limit
      const doc = await shallowConverter.import(markdown);
      expect(doc.content).toBeDefined();
    });

    it('should allow documents within nesting depth limit', async () => {
      const shallowConverter = new DocumentConverter({
        maxBlockDepth: 10,
      });

      const deepList = `
- Level 1
  - Level 2
    - Level 3
      `;

      const doc = await shallowConverter.import(deepList);

      expect(doc.content).toBeDefined();
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should handle error recovery mode - strict (default)', async () => {
      // Create a markdown with potential issues
      const markdown = `# Valid Header

Regular paragraph

\`\`\`unknown-language
code block
\`\`\`

Another paragraph`;

      // Default strict mode should process successfully
      const doc = await converter.import(markdown);

      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should handle error recovery mode - non-strict', async () => {
      const errors: Error[] = [];
      const errorContexts: any[] = [];

      const markdown = `# Header

Content`;

      const doc = await converter.import(markdown, {
        strictMode: false,
        onError: (error, context) => {
          errors.push(error);
          errorContexts.push(context);
        },
      });

      // Document should still be created
      expect(doc.content).toBeDefined();

      // In this simple case, no errors expected
      expect(errors.length).toBe(0);
    });

    it('should handle special characters in content', async () => {
      const markdown = `# Special Characters

Text with emojis: 🎉 🚀 ✨

Unicode: café, naïve, 北京

Symbols: < > & " ' / \\

Mathematical: ∑ ∫ √ π`;

      const doc = await converter.import(markdown);

      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should handle documents with only frontmatter', async () => {
      const markdown = `---
title: Only Frontmatter
tags: test
---`;

      const doc = await converter.import(markdown, { format: 'markdown' });

      expect(doc.metadata.title).toBe('Only Frontmatter');
      expect(doc.content.length).toBe(0);
    });

    it('should disable validation when limits set to 0', async () => {
      const noLimitsConverter = new DocumentConverter({
        maxDocumentSize: 0,
        maxBlocks: 0,
        maxBlockDepth: 0,
      });

      // Create a large markdown document
      const largeDoc = '# Title\n\n' + 'a'.repeat(1000000); // >1MB

      // Should not throw despite large size
      const doc = await noLimitsConverter.import(largeDoc);
      expect(doc).toBeDefined();
      expect(doc.content).toBeDefined();
    });

    it('should handle code blocks with various languages', async () => {
      const markdown = `
\`\`\`javascript
console.log('hello');
\`\`\`

\`\`\`python
print('hello')
\`\`\`

\`\`\`
no language specified
\`\`\`
`;

      const doc = await converter.import(markdown);

      expect(doc.content.length).toBeGreaterThan(0);

      // Find code blocks
      const codeBlocks = doc.content.filter((block: any) => block._type === 'code');
      expect(codeBlocks.length).toBe(3);
    });

    it('should handle mixed content types', async () => {
      const markdown = `# Title

Regular paragraph

- List item 1
- List item 2

> Blockquote

\`\`\`js
code
\`\`\`

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

![Image](https://example.com/image.png)`;

      const doc = await converter.import(markdown);

      expect(doc.content.length).toBeGreaterThan(0);

      // Should have various block types
      const types = new Set(doc.content.map((block: any) => block._type || block.style));
      expect(types.size).toBeGreaterThan(1);
    });

    it('should handle deeply nested lists', async () => {
      const markdown = `# Nested Lists

- Level 1 item 1
  - Level 2 item 1
    - Level 3 item 1
      - Level 4 item 1
    - Level 3 item 2
  - Level 2 item 2
- Level 1 item 2
  - Level 2 item 3`;

      const doc = await converter.import(markdown);

      // Find all list items
      const listItems = doc.content.filter((block: any) => block.listItem);

      expect(listItems.length).toBeGreaterThan(0);

      // Check we have different levels
      const levels = new Set(listItems.map((block: any) => block.level));
      expect(levels.size).toBeGreaterThan(1);

      // Verify deep nesting
      const level4Items = listItems.filter((block: any) => block.level === 4);
      expect(level4Items.length).toBe(1);

      // Export back to markdown
      const exported = await converter.export(doc, 'markdown');

      // Should maintain some level of nesting
      expect(exported).toContain('  -'); // At least 2-space indent
    });

    it('should handle mixed list types in nesting', async () => {
      const markdown = `- Bullet item
  1. Numbered item 1
  2. Numbered item 2
    - Nested bullet
      1. Deeply nested number`;

      const doc = await converter.import(markdown);

      const listItems = doc.content.filter((block: any) => block.listItem);

      // Should have both bullet and number types
      const types = new Set(listItems.map((block: any) => block.listItem));
      expect(types).toContain('bullet');
      expect(types).toContain('number');

      // Should have multiple levels
      const levels = new Set(listItems.map((block: any) => block.level));
      expect(levels.size).toBeGreaterThan(1);
    });

    it('should preserve marks in callouts during round-trip', async () => {
      // Create a document with a callout containing formatted text and links
      const doc = {
        content: [
          {
            _type: 'callout',
            _key: 'callout1',
            calloutType: 'info',
            children: [
              {
                _type: 'span',
                _key: 'span1',
                text: 'This is ',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'span2',
                text: 'bold',
                marks: ['strong'],
              },
              {
                _type: 'span',
                _key: 'span3',
                text: ' and ',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'span4',
                text: 'linked text',
                marks: ['link-1'],
              },
            ],
            markDefs: [
              {
                _type: 'link',
                _key: 'link-1',
                href: 'https://example.com',
              },
            ],
          },
        ],
        metadata: { source: 'test' },
      };

      // Export to markdown
      const markdown = await converter.export(doc, 'markdown');

      // Should contain bold syntax
      expect(markdown).toContain('**bold**');

      // Should contain link syntax
      expect(markdown).toContain('[linked text](https://example.com)');

      // Export to Notion
      const notionJson = await converter.export(doc, 'notion');
      const notion = JSON.parse(notionJson);

      // Find the callout block
      const calloutBlock = notion.results.find((b: any) => b.type === 'callout');
      expect(calloutBlock).toBeDefined();

      // Verify rich text has bold annotation
      const boldSpan = calloutBlock.callout.rich_text.find(
        (rt: any) => rt.annotations.bold === true
      );
      expect(boldSpan).toBeDefined();
      expect(boldSpan.text.content).toBe('bold');

      // Verify rich text has link
      const linkSpan = calloutBlock.callout.rich_text.find(
        (rt: any) => rt.text.link !== null
      );
      expect(linkSpan).toBeDefined();
      expect(linkSpan.text.link.url).toBe('https://example.com');
    });

    it('should generate source maps when requested', async () => {
      const markdown = `# Heading 1

This is a paragraph.

## Heading 2

Another paragraph with **bold** text.

\`\`\`javascript
const x = 1;
\`\`\`

- List item 1
- List item 2`;

      const doc = await converter.import(markdown, { includeSourceMap: true });

      // Source map should exist
      expect(doc.sourceMap).toBeDefined();
      expect(doc.sourceMap?.version).toBe(1);
      expect(doc.sourceMap?.mappings).toBeDefined();
      expect(doc.sourceMap?.sources).toEqual(['markdown']);
      expect(doc.sourceMap?.sourcesContent).toHaveLength(1);

      // Should have mappings for each block
      const mappings = doc.sourceMap!.mappings;
      expect(mappings.length).toBeGreaterThan(0);

      // Each mapping should have required fields
      mappings.forEach(mapping => {
        expect(mapping.blockKey).toBeDefined();
        expect(typeof mapping.line).toBe('number');
        expect(typeof mapping.column).toBe('number');
        expect(mapping.source).toBe('markdown');
        expect(mapping.originalType).toBeDefined();
      });

      // Heading should be at line 1
      const heading1Mapping = mappings.find(m =>
        doc.content.find((b: any) => b._key === m.blockKey && b.style === 'h1')
      );
      expect(heading1Mapping).toBeDefined();
      expect(heading1Mapping?.line).toBe(1);

      // Code block should be present
      const codeBlockMapping = mappings.find(m =>
        doc.content.find((b: any) => b._key === m.blockKey && b._type === 'code')
      );
      expect(codeBlockMapping).toBeDefined();
      expect(codeBlockMapping?.originalType).toBe('code');
    });

    it('should not generate source maps by default', async () => {
      const markdown = `# Test\n\nContent`;
      const doc = await converter.import(markdown);

      expect(doc.sourceMap).toBeUndefined();
    });

    it('should trace block back to original position using source map', async () => {
      const markdown = `---
title: Test
---

# Introduction

This is the introduction.

## Section 1

First section content.`;

      const doc = await converter.import(markdown, { includeSourceMap: true });

      // Find the h2 block
      const h2Block = doc.content.find((b: any) => b.style === 'h2');
      expect(h2Block).toBeDefined();

      // Find its source map entry
      const h2Mapping = doc.sourceMap!.mappings.find(m => m.blockKey === h2Block._key);
      expect(h2Mapping).toBeDefined();

      // Should point to "## Section 1" which is around line 9
      expect(h2Mapping!.line).toBeGreaterThan(7);
      expect(h2Mapping!.originalType).toBe('heading');

      // We can use the source map to extract the original text
      const sourceLines = doc.sourceMap!.sourcesContent![0].split('\n');
      const originalLine = sourceLines[h2Mapping!.line! - 1];
      expect(originalLine).toContain('Section 1');
    });
  });
});
