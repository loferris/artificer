import { describe, it, expect } from 'vitest'
import {
  getLanguageName,
  getLanguageFlag,
  formatLanguagePair,
  getSupportedLanguages,
  isLanguageSupported
} from '../language-utils'

describe('language-utils', () => {
  describe('getLanguageName', () => {
    it('returns correct names for supported languages', () => {
      expect(getLanguageName('eng')).toBe('English')
      expect(getLanguageName('kor')).toBe('Korean')
      expect(getLanguageName('jpn')).toBe('Japanese')
      expect(getLanguageName('cmn')).toBe('Mandarin Chinese')
      expect(getLanguageName('spa')).toBe('Spanish')
    })

    it('handles uppercase codes', () => {
      expect(getLanguageName('ENG')).toBe('English')
      expect(getLanguageName('KOR')).toBe('Korean')
    })

    it('returns uppercase code for unsupported languages', () => {
      expect(getLanguageName('xyz')).toBe('XYZ')
      expect(getLanguageName('abc')).toBe('ABC')
    })
  })

  describe('getLanguageFlag', () => {
    it('returns correct flags for supported languages', () => {
      expect(getLanguageFlag('eng')).toBe('🇬🇧')
      expect(getLanguageFlag('kor')).toBe('🇰🇷')
      expect(getLanguageFlag('jpn')).toBe('🇯🇵')
      expect(getLanguageFlag('cmn')).toBe('🇨🇳')
      expect(getLanguageFlag('spa')).toBe('🇪🇸')
    })

    it('handles uppercase codes', () => {
      expect(getLanguageFlag('ENG')).toBe('🇬🇧')
      expect(getLanguageFlag('KOR')).toBe('🇰🇷')
    })

    it('returns globe emoji for unsupported languages', () => {
      expect(getLanguageFlag('xyz')).toBe('🌐')
      expect(getLanguageFlag('abc')).toBe('🌐')
    })
  })

  describe('formatLanguagePair', () => {
    it('formats full language pair correctly', () => {
      const result = formatLanguagePair('kor', 'eng', 'full')
      expect(result).toBe('🇰🇷 Korean → 🇬🇧 English')
    })

    it('formats short language pair correctly', () => {
      const result = formatLanguagePair('kor', 'eng', 'short')
      expect(result).toBe('Korean → English')
    })

    it('formats flags-only language pair correctly', () => {
      const result = formatLanguagePair('kor', 'eng', 'flags')
      expect(result).toBe('🇰🇷 → 🇬🇧')
    })

    it('defaults to full format', () => {
      const result = formatLanguagePair('kor', 'eng')
      expect(result).toBe('🇰🇷 Korean → 🇬🇧 English')
    })

    it('handles unsupported languages', () => {
      const result = formatLanguagePair('xyz', 'abc', 'full')
      expect(result).toBe('🌐 XYZ → 🌐 ABC')
    })

    it('handles mixed case', () => {
      const result = formatLanguagePair('KOR', 'ENG', 'full')
      expect(result).toBe('🇰🇷 Korean → 🇬🇧 English')
    })
  })

  describe('getSupportedLanguages', () => {
    it('returns array of language codes', () => {
      const languages = getSupportedLanguages()

      expect(Array.isArray(languages)).toBe(true)
      expect(languages.length).toBeGreaterThan(0)
      expect(languages).toContain('eng')
      expect(languages).toContain('kor')
      expect(languages).toContain('jpn')
    })

    it('returns all lowercase codes', () => {
      const languages = getSupportedLanguages()

      languages.forEach(code => {
        expect(code).toBe(code.toLowerCase())
      })
    })
  })

  describe('isLanguageSupported', () => {
    it('returns true for supported languages', () => {
      expect(isLanguageSupported('eng')).toBe(true)
      expect(isLanguageSupported('kor')).toBe(true)
      expect(isLanguageSupported('jpn')).toBe(true)
    })

    it('handles uppercase codes', () => {
      expect(isLanguageSupported('ENG')).toBe(true)
      expect(isLanguageSupported('KOR')).toBe(true)
    })

    it('returns false for unsupported languages', () => {
      expect(isLanguageSupported('xyz')).toBe(false)
      expect(isLanguageSupported('abc')).toBe(false)
      expect(isLanguageSupported('')).toBe(false)
    })
  })
})
