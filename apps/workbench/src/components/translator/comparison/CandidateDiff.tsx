import { DiffViewer } from '@artificer/ui'
import { specialistThemes, type SpecialistType } from '@artificer/translator'
import { useComponentLogger } from '@artificer/ui'
import type { DiffGranularity } from '@artificer/ui'

export interface CandidateDiffProps {
  candidateA: {
    id: string
    specialist: SpecialistType
    translation: string
  }
  candidateB: {
    id: string
    specialist: SpecialistType
    translation: string
  }
  highlightLevel?: DiffGranularity
  mode?: 'side-by-side' | 'unified'
  className?: string
}

/**
 * Highlight differences between two candidates
 * ⭐⭐ High Priority Component - Now using Artificer UI DiffViewer
 *
 * Features:
 * - Word/sentence/paragraph-level diff highlighting
 * - Side-by-side or unified view
 * - Color coding (additions, deletions, changes)
 * - Toggle between candidates quickly
 * - Copy either version
 *
 * Migration: Reduced from 239 lines to ~60 lines using @artificer/ui DiffViewer
 */
export function CandidateDiff({
  candidateA,
  candidateB,
  highlightLevel = 'word',
  mode = 'side-by-side',
  className
}: CandidateDiffProps) {
  const { logInteraction } = useComponentLogger({
    component: 'CandidateDiff',
    metadata: {
      candidateA: candidateA.specialist,
      candidateB: candidateB.specialist
    }
  })

  return (
    <DiffViewer
      before={candidateA}
      after={candidateB}
      getBeforeText={(candidate) => candidate.translation}
      getAfterText={(candidate) => candidate.translation}
      beforeTheme={specialistThemes.get(candidateA.specialist)}
      afterTheme={specialistThemes.get(candidateB.specialist)}
      mode={mode}
      granularity={highlightLevel}
      className={className}
      renderBeforeMetadata={(candidate) => (
        <div>
          <p className="text-xs text-gray-600">Original</p>
        </div>
      )}
      renderAfterMetadata={(candidate) => (
        <div>
          <p className="text-xs text-gray-600">Comparison</p>
        </div>
      )}
    />
  )
}
