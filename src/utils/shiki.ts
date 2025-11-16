/**
 * Shiki syntax highlighting utilities
 *
 * Provides a singleton highlighter instance for efficient code highlighting
 * across the application. Supports 200+ languages with VS Code themes.
 */

import { createHighlighter, type Highlighter, type BundledLanguage, type BundledTheme } from 'shiki';

let highlighterInstance: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;

// Popular languages to preload for better performance
const DEFAULT_LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'cpp',
  'c',
  'csharp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'html',
  'css',
  'jsx',
  'tsx',
];

const DEFAULT_THEMES: BundledTheme[] = ['github-dark', 'github-light'];

/**
 * Get or create the singleton Shiki highlighter instance
 * Lazy loads languages on first use for optimal performance
 */
export async function getShikiHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  // If already initializing, wait for that promise
  if (initPromise) {
    return initPromise;
  }

  // Create new highlighter instance
  initPromise = createHighlighter({
    themes: DEFAULT_THEMES,
    langs: DEFAULT_LANGS,
  }).then(highlighter => {
    highlighterInstance = highlighter;
    initPromise = null;
    return highlighter;
  });

  return initPromise;
}

export interface HighlightOptions {
  theme?: 'github-dark' | 'github-light';
  lineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Highlight code with Shiki
 *
 * @param code - Source code to highlight
 * @param lang - Language identifier (e.g., 'typescript', 'python')
 * @param options - Optional highlighting options
 * @returns HTML string with syntax highlighting
 */
export async function highlightCode(
  code: string,
  lang: string,
  options: HighlightOptions = {}
): Promise<string> {
  const {
    theme = 'github-dark',
    lineNumbers = false,
    highlightLines = [],
  } = options;

  try {
    const highlighter = await getShikiHighlighter();

    // Check if language is loaded
    const loadedLanguages = highlighter.getLoadedLanguages();
    const normalizedLang = lang.toLowerCase() as BundledLanguage;

    // Load language dynamically if not already loaded
    if (!loadedLanguages.includes(normalizedLang)) {
      try {
        await highlighter.loadLanguage(normalizedLang);
      } catch (error) {
        console.warn(`Shiki: Unknown language "${lang}", falling back to plaintext`);
        return highlighter.codeToHtml(code, {
          lang: 'txt',
          theme,
        });
      }
    }

    // Generate highlighted HTML
    return highlighter.codeToHtml(code, {
      lang: normalizedLang,
      theme,
      transformers: lineNumbers || highlightLines.length > 0 ? [
        {
          line(node, line) {
            // Add line number attribute
            if (lineNumbers) {
              node.properties['data-line'] = line;
            }

            // Highlight specific lines
            if (highlightLines.includes(line)) {
              const existingClass = node.properties.class as string || '';
              node.properties.class = `${existingClass} highlighted`.trim();
            }
          },
        },
      ] : undefined,
    });
  } catch (error) {
    console.error('Shiki highlighting error:', error);
    // Fallback to plain pre/code block
    return `<pre class="shiki" style="background-color: #0d1117; color: #c9d1d9;"><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Highlight code with dual theme support (light/dark)
 * Useful for apps with theme switching
 */
export async function highlightCodeDualTheme(
  code: string,
  lang: string
): Promise<string> {
  try {
    const highlighter = await getShikiHighlighter();

    // Check if language is loaded
    const loadedLanguages = highlighter.getLoadedLanguages();
    const normalizedLang = lang.toLowerCase() as BundledLanguage;

    if (!loadedLanguages.includes(normalizedLang)) {
      try {
        await highlighter.loadLanguage(normalizedLang);
      } catch (error) {
        console.warn(`Shiki: Unknown language "${lang}", falling back to plaintext`);
        return highlighter.codeToHtml(code, {
          lang: 'txt',
          themes: {
            dark: 'github-dark',
            light: 'github-light',
          },
        });
      }
    }

    return highlighter.codeToHtml(code, {
      lang: normalizedLang,
      themes: {
        dark: 'github-dark',
        light: 'github-light',
      },
    });
  } catch (error) {
    console.error('Shiki dual theme highlighting error:', error);
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m] || m);
}

/**
 * Check if a language is supported by Shiki
 */
export async function isLanguageSupported(lang: string): Promise<boolean> {
  try {
    const highlighter = await getShikiHighlighter();
    const loadedLanguages = highlighter.getLoadedLanguages();

    // Check if already loaded
    if (loadedLanguages.includes(lang as BundledLanguage)) {
      return true;
    }

    // Try to load it
    try {
      await highlighter.loadLanguage(lang as BundledLanguage);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Preload additional languages for better performance
 * Useful for languages you know will be used frequently
 */
export async function preloadLanguages(langs: string[]): Promise<void> {
  const highlighter = await getShikiHighlighter();

  for (const lang of langs) {
    try {
      const loadedLanguages = highlighter.getLoadedLanguages();
      if (!loadedLanguages.includes(lang as BundledLanguage)) {
        await highlighter.loadLanguage(lang as BundledLanguage);
      }
    } catch (error) {
      console.warn(`Failed to preload language "${lang}":`, error);
    }
  }
}
