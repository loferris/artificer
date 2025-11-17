import { describe, it, expect } from 'vitest'
import {
  computeDiff,
  getSimilarityScore,
  highlightDifferences,
  mergeSegments,
  type DiffSegment
} from '../diff-engine'

describe('diff-engine', () => {
  describe('computeDiff', () => {
    it('detects additions correctly', () => {
      const result = computeDiff('hello', 'hello world', 'word')

      const additions = result.segments.filter(s => s.type === 'added')
      expect(additions.length).toBeGreaterThan(0)
      expect(result.stats.additions).toBeGreaterThan(0)
    })

    it('detects deletions correctly', () => {
      const result = computeDiff('hello world', 'hello', 'word')

      const deletions = result.segments.filter(s => s.type === 'removed')
      expect(deletions.length).toBeGreaterThan(0)
      expect(result.stats.deletions).toBeGreaterThan(0)
    })

    it('detects unchanged text correctly', () => {
      const result = computeDiff('hello world', 'hello world', 'word')

      const unchanged = result.segments.filter(s => s.type === 'unchanged')
      expect(unchanged.length).toBeGreaterThan(0)
      expect(result.stats.unchanged).toBe(2) // 'hello' and 'world'
    })

    it('works with character granularity', () => {
      const result = computeDiff('abc', 'adc', 'character')

      expect(result.granularity).toBe('character')
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('works with word granularity', () => {
      const result = computeDiff('hello world', 'hello there world', 'word')

      expect(result.granularity).toBe('word')
      expect(result.segments.some(s => s.value === 'there')).toBe(true)
    })

    it('works with sentence granularity', () => {
      const text1 = 'First sentence. Second sentence.'
      const text2 = 'First sentence. Third sentence.'

      const result = computeDiff(text1, text2, 'sentence')

      expect(result.granularity).toBe('sentence')
    })

    it('works with paragraph granularity', () => {
      const text1 = 'First paragraph.\n\nSecond paragraph.'
      const text2 = 'First paragraph.\n\nThird paragraph.'

      const result = computeDiff(text1, text2, 'paragraph')

      expect(result.granularity).toBe('paragraph')
    })

    it('handles identical texts', () => {
      const result = computeDiff('same text', 'same text', 'word')

      expect(result.stats.additions).toBe(0)
      expect(result.stats.deletions).toBe(0)
      expect(result.stats.unchanged).toBeGreaterThan(0)
    })

    it('handles completely different texts', () => {
      const result = computeDiff('abc', 'xyz', 'word')

      expect(result.stats.unchanged).toBe(0)
      expect(result.stats.additions + result.stats.deletions).toBeGreaterThan(0)
    })

    it('defaults to word granularity', () => {
      const result = computeDiff('hello', 'world')

      expect(result.granularity).toBe('word')
    })

    it('assigns indices to segments', () => {
      const result = computeDiff('hello world', 'hello there', 'word')

      result.segments.forEach(segment => {
        expect(typeof segment.index).toBe('number')
        expect(segment.index).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('getSimilarityScore', () => {
    it('returns 1 for identical texts', () => {
      const score = getSimilarityScore('same text', 'same text', 'word')

      expect(score).toBe(1)
    })

    it('returns 0 for completely different texts', () => {
      const score = getSimilarityScore('abc', 'xyz', 'word')

      expect(score).toBe(0)
    })

    it('returns value between 0 and 1 for similar texts', () => {
      const score = getSimilarityScore('hello world', 'hello there', 'word')

      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(1)
    })

    it('handles empty texts', () => {
      const score = getSimilarityScore('', '', 'word')

      expect(score).toBe(1)
    })

    it('works with different granularities', () => {
      const text1 = 'She bowed deeply'
      const text2 = 'She bowed gracefully'

      const wordScore = getSimilarityScore(text1, text2, 'word')
      const charScore = getSimilarityScore(text1, text2, 'character')

      expect(wordScore).toBeGreaterThanOrEqual(0)
      expect(wordScore).toBeLessThanOrEqual(1)
      expect(charScore).toBeGreaterThanOrEqual(0)
      expect(charScore).toBeLessThanOrEqual(1)
    })
  })

  describe('highlightDifferences', () => {
    it('highlights differences between texts', () => {
      const texts = [
        'hello world',
        'hello there',
        'hello everyone'
      ]

      const differences = highlightDifferences(texts, 'word')

      expect(differences.size).toBe(3)
    })

    it('handles less than 2 texts', () => {
      const differences = highlightDifferences(['single text'], 'word')

      expect(differences.size).toBe(0)
    })

    it('handles empty array', () => {
      const differences = highlightDifferences([], 'word')

      expect(differences.size).toBe(0)
    })

    it('identifies differing positions correctly', () => {
      const texts = [
        'same different same',
        'same other same',
        'same another same'
      ]

      const differences = highlightDifferences(texts, 'word')

      // First text's differences
      const firstDiffs = differences.get(0)
      expect(firstDiffs).toBeDefined()

      // 'different' is at index 1, should be marked as different
      if (firstDiffs) {
        expect(firstDiffs.has(1)).toBe(true)
      }
    })
  })

  describe('mergeSegments', () => {
    it('merges word segments with spaces', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'hello', index: 0 },
        { type: 'unchanged', value: 'world', index: 1 }
      ]

      const result = mergeSegments(segments, 'word')

      expect(result).toBe('hello world')
    })

    it('merges character segments without spaces', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'a', index: 0 },
        { type: 'unchanged', value: 'b', index: 1 },
        { type: 'unchanged', value: 'c', index: 2 }
      ]

      const result = mergeSegments(segments, 'character')

      expect(result).toBe('abc')
    })

    it('merges paragraph segments with double newlines', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'Para 1', index: 0 },
        { type: 'unchanged', value: 'Para 2', index: 1 }
      ]

      const result = mergeSegments(segments, 'paragraph')

      expect(result).toBe('Para 1\n\nPara 2')
    })

    it('fixes punctuation spacing', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'Hello', index: 0 },
        { type: 'unchanged', value: ',', index: 1 },
        { type: 'unchanged', value: 'world', index: 2 }
      ]

      const result = mergeSegments(segments, 'word')

      expect(result).toBe('Hello, world')
    })

    it('handles empty segments array', () => {
      const result = mergeSegments([], 'word')

      expect(result).toBe('')
    })

    it('handles single segment', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'hello', index: 0 }
      ]

      const result = mergeSegments(segments, 'word')

      expect(result).toBe('hello')
    })

    it('handles mixed segment types', () => {
      const segments: DiffSegment[] = [
        { type: 'unchanged', value: 'hello', index: 0 },
        { type: 'added', value: 'beautiful', index: 1 },
        { type: 'unchanged', value: 'world', index: 2 }
      ]

      const result = mergeSegments(segments, 'word')

      expect(result).toBe('hello beautiful world')
    })
  })
})
