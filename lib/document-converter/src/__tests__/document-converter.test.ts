/**
 * Tests for DocumentConverter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentConverter } from '../index.js';

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
});
