import React, { useEffect, useRef } from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { specialistThemes, type SpecialistType, getSpecialistTagline } from '@artificer/translator'
import { CopyButton } from '@artificer/ui'
import { BadgeGroup } from '@artificer/ui'
import { ExpandableSection } from '@artificer/ui'
import { formatCost } from '@/lib/cost-utils'
import { cn } from '@artificer/ui'
import { createComponentLogger } from '@artificer/ui'

const logger = createComponentLogger('SpecialistCard')

export interface SpecialistCardProps {
  specialist: SpecialistType
  translation: string
  processingTime?: number
  cost?: number
  rating?: number
  insights?: string[]
  onRate?: (rating: number) => void
  onSelect?: () => void
  selected?: boolean
  className?: string
}

/**
 * Display one specialist's output with their "personality"
 * ⭐⭐ High Priority Component
 *
 * Features:
 * - Specialist-themed header with icon
 * - Translation text display
 * - Copy to clipboard
 * - Expandable insights
 * - Processing stats (time, cost)
 * - Optional rating system
 * - Selection state
 */
export function SpecialistCard({
  specialist,
  translation,
  processingTime,
  cost,
  rating,
  insights = [],
  onRate,
  onSelect,
  selected = false,
  className
}: SpecialistCardProps) {
  const theme = specialistThemes.get(specialist)!
  const tagline = getSpecialistTagline(specialist)

  const initialPropsRef = useRef({
    specialist,
    hasInsights: insights.length > 0,
    hasRating: !!rating
  })
  useEffect(() => {
    const { specialist: initialSpecialist, hasInsights, hasRating } = initialPropsRef.current
    logger.lifecycle('SpecialistCard', 'mount', {
      specialist: initialSpecialist,
      hasInsights,
      hasRating
    })

    return () => {
      logger.lifecycle('SpecialistCard', 'unmount')
    }
  }, []) // Only run on mount/unmount for lifecycle logging

  const handleCardClick = () => {
    logger.interaction({
      component: 'SpecialistCard',
      action: 'card_click',
      target: specialist,
      metadata: { selected }
    })
    onSelect?.()
  }

  const handleRating = (newRating: number) => {
    logger.interaction({
      component: 'SpecialistCard',
      action: 'rate',
      target: specialist,
      metadata: { rating: newRating }
    })
    onRate?.(newRating)
  }

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer",
        selected && `ring-2 ${theme.borderColor.replace('border-', 'ring-')}`,
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className={cn("border-b-2", theme.borderColor, theme.bgColor)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{theme.icon}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-base">{theme.label}</h3>
              <p className="text-xs text-gray-600 truncate">{tagline}</p>
            </div>
          </div>
          <CopyButton text={translation} showLabel={false} size="icon" />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="text-sm text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed">
          {translation}
        </div>

        {insights.length > 0 && (
          <ExpandableSection
            preview={
              <div className="text-xs text-gray-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{insights.length} {insights.length === 1 ? 'insight' : 'insights'}</span>
              </div>
            }
            details={
              <ul className="text-xs text-gray-600 space-y-1">
                {insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 flex-shrink-0">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            }
          />
        )}
      </CardContent>

      <CardFooter className="border-t pt-4 flex-wrap gap-2">
        <BadgeGroup
          items={[
            processingTime && {
              label: `${processingTime}ms`,
              variant: 'gray',
              icon: '⚡'
            },
            cost && {
              label: formatCost(cost),
              variant: 'gray',
              icon: '💰'
            },
            rating && {
              label: `${rating}/5`,
              variant: 'yellow',
              icon: '⭐'
            },
          ].filter(Boolean) as any}
        />

        {onRate && (
          <div className="ml-auto flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRating(star)
                }}
                className={cn(
                  "text-lg transition-colors",
                  rating && star <= rating ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                )}
              >
                ★
              </button>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
