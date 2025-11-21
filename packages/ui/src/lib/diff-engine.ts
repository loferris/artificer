/**
 * Diff Engine for Translator
 *
 * Provides text diffing capabilities at word, sentence, and paragraph level
 * Used in: CandidateComparison, CandidateDiff, InteractiveDiff, ABTestComparison
 */

export type DiffGranularity = 'word' | 'sentence' | 'paragraph' | 'character'

export type DiffType = 'added' | 'removed' | 'unchanged' | 'modified'

export interface DiffSegment {
  type: DiffType
  value: string
  index: number
}

export interface DiffResult {
  segments: DiffSegment[]
  granularity: DiffGranularity
  stats: {
    additions: number
    deletions: number
    modifications: number
    unchanged: number
  }
}

/**
 * Split text into segments based on granularity
 */
function splitByGranularity(text: string, granularity: DiffGranularity): string[] {
  switch (granularity) {
    case 'character':
      return text.split('')

    case 'word':
      // Split by whitespace and punctuation, but keep punctuation attached
      return text.match(/[\w']+|[.,!?;:()"\-]/g) || []

    case 'sentence':
      // Split by sentence-ending punctuation
      return text
        .split(/([.!?]+\s+)/)
        .filter(s => s.trim().length > 0)

    case 'paragraph':
      // Split by double newlines
      return text
        .split(/\n\n+/)
        .filter(p => p.trim().length > 0)

    default:
      return [text]
  }
}

/**
 * Compute diff between two texts using LCS (Longest Common Subsequence) algorithm
 * This is a simplified implementation - in production, you might use the 'diff' library
 */
function computeLCS(arr1: string[], arr2: string[]): number[][] {
  const m = arr1.length
  const n = arr2.length
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * Build diff segments from LCS table
 */
function buildDiffSegments(
  arr1: string[],
  arr2: string[],
  dp: number[][],
  i: number,
  j: number,
  segments: DiffSegment[] = []
): DiffSegment[] {
  if (i === 0 && j === 0) {
    return segments.reverse()
  }

  if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
    segments.push({
      type: 'unchanged',
      value: arr1[i - 1],
      index: i - 1
    })
    return buildDiffSegments(arr1, arr2, dp, i - 1, j - 1, segments)
  }

  if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    segments.push({
      type: 'added',
      value: arr2[j - 1],
      index: j - 1
    })
    return buildDiffSegments(arr1, arr2, dp, i, j - 1, segments)
  }

  if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
    segments.push({
      type: 'removed',
      value: arr1[i - 1],
      index: i - 1
    })
    return buildDiffSegments(arr1, arr2, dp, i - 1, j, segments)
  }

  return segments.reverse()
}

/**
 * Compute diff between two texts
 */
export function computeDiff(
  textA: string,
  textB: string,
  granularity: DiffGranularity = 'word'
): DiffResult {
  const segmentsA = splitByGranularity(textA, granularity)
  const segmentsB = splitByGranularity(textB, granularity)

  const dp = computeLCS(segmentsA, segmentsB)
  const diffSegments = buildDiffSegments(
    segmentsA,
    segmentsB,
    dp,
    segmentsA.length,
    segmentsB.length
  )

  // Calculate stats
  const stats = {
    additions: diffSegments.filter(s => s.type === 'added').length,
    deletions: diffSegments.filter(s => s.type === 'removed').length,
    modifications: 0, // Simplified - would need more complex logic
    unchanged: diffSegments.filter(s => s.type === 'unchanged').length
  }

  return {
    segments: diffSegments,
    granularity,
    stats
  }
}

/**
 * Highlight differences between multiple texts (for comparison grid)
 */
export function highlightDifferences(texts: string[], granularity: DiffGranularity = 'word'): Map<number, Set<number>> {
  if (texts.length < 2) return new Map()

  // Map of text index -> set of segment indices that differ from others
  const differences = new Map<number, Set<number>>()

  // Split all texts
  const allSegments = texts.map(text => splitByGranularity(text, granularity))

  // Compare each text against all others
  for (let i = 0; i < texts.length; i++) {
    const diffs = new Set<number>()

    for (let segIdx = 0; segIdx < allSegments[i].length; segIdx++) {
      const segment = allSegments[i][segIdx]

      // Check if this segment differs in any other text at the same position
      for (let j = 0; j < texts.length; j++) {
        if (i !== j && allSegments[j][segIdx] !== segment) {
          diffs.add(segIdx)
          break
        }
      }
    }

    differences.set(i, diffs)
  }

  return differences
}

/**
 * Get similarity score between two texts (0-1, where 1 is identical)
 */
export function getSimilarityScore(textA: string, textB: string, granularity: DiffGranularity = 'word'): number {
  const diff = computeDiff(textA, textB, granularity)
  const total = diff.segments.length

  if (total === 0) return 1

  return diff.stats.unchanged / total
}

/**
 * Merge segments back into text with spacing
 */
export function mergeSegments(segments: DiffSegment[], granularity: DiffGranularity): string {
  const separator = granularity === 'word' ? ' ' : granularity === 'character' ? '' : '\n\n'

  return segments
    .map(seg => seg.value)
    .join(separator)
    .replace(/\s+([.,!?;:])/g, '$1') // Fix punctuation spacing
}
