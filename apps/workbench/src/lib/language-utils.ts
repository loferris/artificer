/**
 * Language utilities for FableForge components
 * Used in: TranslationJobCard, MetadataExplorer
 */

// Common language codes and their display names
const languageNames: Record<string, string> = {
  'eng': 'English',
  'kor': 'Korean',
  'jpn': 'Japanese',
  'cmn': 'Mandarin Chinese',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'rus': 'Russian',
  'ara': 'Arabic',
  'hin': 'Hindi',
  'tha': 'Thai',
  'vie': 'Vietnamese'
}

// Language code to flag emoji mapping
const languageFlags: Record<string, string> = {
  'eng': '🇬🇧',
  'kor': '🇰🇷',
  'jpn': '🇯🇵',
  'cmn': '🇨🇳',
  'spa': '🇪🇸',
  'fra': '🇫🇷',
  'deu': '🇩🇪',
  'ita': '🇮🇹',
  'por': '🇵🇹',
  'rus': '🇷🇺',
  'ara': '🇸🇦',
  'hin': '🇮🇳',
  'tha': '🇹🇭',
  'vie': '🇻🇳'
}

/**
 * Get the display name for a language code
 */
export function getLanguageName(code: string): string {
  return languageNames[code.toLowerCase()] || code.toUpperCase()
}

/**
 * Get the flag emoji for a language code
 */
export function getLanguageFlag(code: string): string {
  return languageFlags[code.toLowerCase()] || '🌐'
}

/**
 * Format a language pair for display (e.g., "🇰🇷 Korean → 🇬🇧 English")
 */
export function formatLanguagePair(
  sourceCode: string,
  targetCode: string,
  format: 'full' | 'short' | 'flags' = 'full'
): string {
  const sourceFlag = getLanguageFlag(sourceCode)
  const targetFlag = getLanguageFlag(targetCode)
  const sourceName = getLanguageName(sourceCode)
  const targetName = getLanguageName(targetCode)

  switch (format) {
    case 'full':
      return `${sourceFlag} ${sourceName} → ${targetFlag} ${targetName}`
    case 'short':
      return `${sourceName} → ${targetName}`
    case 'flags':
      return `${sourceFlag} → ${targetFlag}`
    default:
      return `${sourceFlag} ${sourceName} → ${targetFlag} ${targetName}`
  }
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageNames)
}

/**
 * Check if a language code is supported
 */
export function isLanguageSupported(code: string): boolean {
  return code.toLowerCase() in languageNames
}
