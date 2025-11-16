/**
 * Tests for Shiki syntax highlighting utilities
 */

import { describe, it, expect } from 'vitest';
import { highlightCode, getShikiHighlighter, isLanguageSupported } from '../shiki';

describe('Shiki Utilities', () => {
  describe('getShikiHighlighter', () => {
    it('should return a highlighter instance', async () => {
      const highlighter = await getShikiHighlighter();
      expect(highlighter).toBeDefined();
      expect(highlighter.codeToHtml).toBeDefined();
    });

    it('should return the same instance on subsequent calls (singleton)', async () => {
      const highlighter1 = await getShikiHighlighter();
      const highlighter2 = await getShikiHighlighter();
      expect(highlighter1).toBe(highlighter2);
    });
  });

  describe('highlightCode', () => {
    it('should highlight TypeScript code', async () => {
      const code = 'const foo: string = "bar";';
      const html = await highlightCode(code, 'typescript');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
      expect(html).toContain('const'); // TypeScript keyword should be present
    });

    it('should highlight Python code', async () => {
      const code = 'def hello():\n    print("world")';
      const html = await highlightCode(code, 'python');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
      expect(html).toContain('def'); // Python keyword
    });

    it('should highlight JavaScript code', async () => {
      const code = 'function test() { return true; }';
      const html = await highlightCode(code, 'javascript');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
      expect(html).toContain('function');
    });

    it('should handle JSON', async () => {
      const code = '{"name": "test", "value": 123}';
      const html = await highlightCode(code, 'json');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
    });

    it('should fallback to plaintext for unknown languages', async () => {
      const code = 'some random code';
      const html = await highlightCode(code, 'unknownlanguage123');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
      expect(html).toContain('some random code');
    });

    it('should handle empty code', async () => {
      const html = await highlightCode('', 'typescript');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
    });

    it('should handle multiline code', async () => {
      const code = `function test() {
  const x = 1;
  const y = 2;
  return x + y;
}`;
      const html = await highlightCode(code, 'javascript');

      expect(html).toContain('<pre');
      expect(html).toContain('class="shiki');
      expect(html).toContain('function');
      expect(html).toContain('const');
    });

    it('should escape HTML in code', async () => {
      const code = '<script>alert("xss")</script>';
      const html = await highlightCode(code, 'html');

      // Should not contain raw script tags (they should be escaped)
      expect(html).toContain('<pre');
      // The content should be escaped/highlighted (Shiki uses &#x3C; instead of &lt;)
      expect(html).toContain('&#x3C;') || expect(html).toContain('&lt;');
      // Should contain script as highlighted text
      expect(html).toContain('script');
    });

    it('should support different themes', async () => {
      const code = 'const x = 1;';
      const darkHtml = await highlightCode(code, 'javascript', { theme: 'github-dark' });
      const lightHtml = await highlightCode(code, 'javascript', { theme: 'github-light' });

      expect(darkHtml).toContain('<pre');
      expect(lightHtml).toContain('<pre');
      // Different themes should produce different output
      expect(darkHtml).not.toEqual(lightHtml);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for TypeScript', async () => {
      const supported = await isLanguageSupported('typescript');
      expect(supported).toBe(true);
    });

    it('should return true for Python', async () => {
      const supported = await isLanguageSupported('python');
      expect(supported).toBe(true);
    });

    it('should return false for unknown languages', async () => {
      const supported = await isLanguageSupported('totallyfakelanguage999');
      expect(supported).toBe(false);
    });

    it('should handle dynamically loaded languages', async () => {
      // Ruby might not be preloaded, but should be loadable
      const supported = await isLanguageSupported('ruby');
      expect(supported).toBe(true);
    });
  });

  describe('Code Samples', () => {
    it('should highlight Rust code', async () => {
      const code = `fn main() {
    println!("Hello, world!");
}`;
      const html = await highlightCode(code, 'rust');

      expect(html).toContain('<pre');
      expect(html).toContain('fn');
      expect(html).toContain('println!');
    });

    it('should highlight Go code', async () => {
      const code = `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`;
      const html = await highlightCode(code, 'go');

      expect(html).toContain('<pre');
      expect(html).toContain('>package<');
      expect(html).toContain('>func<');
    });

    it('should highlight SQL code', async () => {
      const code = 'SELECT * FROM users WHERE id = 1;';
      const html = await highlightCode(code, 'sql');

      expect(html).toContain('<pre');
      expect(html).toContain('>SELECT<') || expect(html).toContain('>select<');
    });

    it('should highlight Bash/Shell code', async () => {
      const code = '#!/bin/bash\necho "Hello World"';
      const html = await highlightCode(code, 'bash');

      expect(html).toContain('<pre');
      expect(html).toContain('echo');
    });
  });
});
