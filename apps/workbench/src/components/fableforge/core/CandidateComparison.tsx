import React, { useState, useEffect, useRef } from 'react'
import { SpecialistCard } from './SpecialistCard'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { specialistThemes, type SpecialistType } from '@artificer/fableforge'
import { cn } from '@artificer/ui'
import { createComponentLogger } from '@artificer/ui'

const logger = createComponentLogger('CandidateComparison')

export interface Candidate {
  id: string
  specialist: SpecialistType
  translation: string
  processingTime?: number
  cost?: number
  rating?: number
  insights?: string[]
}

export interface CandidateComparisonProps {
  candidates: Candidate[]
  finalSynthesis?: string
  onRate?: (candidateId: string, rating: number) => void
  onSelect?: (candidateId: string) => void
  onCopy?: (candidateId: string) => void
  className?: string
  layout?: '2x3' | '3x2' | 'grid'
}

/**
 * The killer feature - comparing 5 specialist translations side-by-side
 * ⭐⭐⭐ Must-Have Component
 *
 * Features:
 * - Grid layout (2x3 or 3x2)
 * - Click to expand/focus one candidate
 * - Star rating (1-5) for each
 * - Highlight differences between candidates
 * - Copy to clipboard
 * - "Use as base" button
 * - Visual indicator for final synthesis
 */
export const CandidateComparison = React.memo(function CandidateComparison({
  candidates,
  finalSynthesis,
  onRate,
  onSelect,
  onCopy,
  className,
  layout = 'grid'
}: CandidateComparisonProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const initialPropsRef = useRef({
    candidatesCount: candidates.length,
    hasFinalSynthesis: !!finalSynthesis,
    layout
  })
  useEffect(() => {
    const { candidatesCount, hasFinalSynthesis, layout: initialLayout } = initialPropsRef.current
    logger.lifecycle('CandidateComparison', 'mount', {
      candidatesCount,
      hasFinalSynthesis,
      layout: initialLayout
    })

    return () => {
      logger.lifecycle('CandidateComparison', 'unmount')
    }
  }, []) // Only run on mount/unmount for lifecycle logging

  const gridClasses = {
    '2x3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    '3x2': 'grid-cols-1 md:grid-cols-3',
    'grid': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }

  const handleCardClick = (id: string) => {
    const candidate = candidates.find(c => c.id === id)
    const action = focusedId === id ? 'unfocus' : 'focus'

    logger.interaction({
      component: 'CandidateComparison',
      action: `candidate_${action}`,
      target: candidate?.specialist,
      metadata: { candidateId: id }
    })

    if (focusedId === id) {
      setFocusedId(null)
    } else {
      setFocusedId(id)
    }
    onSelect?.(id)
  }

  const handleRate = (candidateId: string, rating: number) => {
    const candidate = candidates.find(c => c.id === candidateId)

    logger.interaction({
      component: 'CandidateComparison',
      action: 'rate_candidate',
      target: candidate?.specialist,
      metadata: { candidateId, rating }
    })

    onRate?.(candidateId, rating)
  }

  const handleSelect = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId)

    logger.interaction({
      component: 'CandidateComparison',
      action: 'select_candidate',
      target: candidate?.specialist,
      metadata: { candidateId }
    })

    setSelectedId(candidateId)
    onCopy?.(candidateId)
  }

  // If a card is focused, show only that card
  if (focusedId) {
    const focusedCandidate = candidates.find(c => c.id === focusedId)
    if (focusedCandidate) {
      return (
        <div className={cn("space-y-4", className)}>
          {/* Back button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFocusedId(null)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to all candidates
          </Button>

          {/* Focused card */}
          <SpecialistCard
            {...focusedCandidate}
            onRate={(rating) => handleRate(focusedCandidate.id, rating)}
            onSelect={() => handleSelect(focusedCandidate.id)}
            selected={selectedId === focusedCandidate.id}
          />

          {/* Use as base button */}
          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={() => handleSelect(focusedCandidate.id)}
            >
              Use as base for editing
            </Button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Specialist Candidates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Compare {candidates.length} specialist translations • Click to focus
          </p>
        </div>
      </div>

      {/* Candidates grid */}
      <div className={cn("grid gap-4", gridClasses[layout])}>
        {candidates.map((candidate) => (
          <SpecialistCard
            key={candidate.id}
            {...candidate}
            onRate={(rating) => handleRate(candidate.id, rating)}
            onSelect={() => handleCardClick(candidate.id)}
            selected={selectedId === candidate.id}
          />
        ))}
      </div>

      {/* Final synthesis */}
      {finalSynthesis && (
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardHeader className="border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{specialistThemes.get('final_synthesis')!.icon}</span>
              <div>
                <h3 className="font-semibold">Final Synthesis</h3>
                <p className="text-xs text-gray-600">
                  Senior editor&apos;s combined translation
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
              {finalSynthesis}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Comparison Tips</p>
            <ul className="text-xs space-y-1 text-blue-800">
              <li>• Click any card to focus and see full details</li>
              <li>• Rate candidates to help improve future translations</li>
              <li>• Use the &ldquo;Copy&rdquo; button to quickly grab a translation</li>
              <li>• Check insights to understand each specialist&apos;s approach</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
})
CandidateComparison.displayName = 'CandidateComparison'
