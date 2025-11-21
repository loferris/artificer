/**
 * Artificer UI - Expandable Section Component
 *
 * Component for expandable/collapsible content sections
 */

import React from 'react'
import { useExpandable } from '../hooks/useExpandable'
import { cn } from '../lib/cn'

export interface ExpandableSectionProps {
  preview: React.ReactNode
  details: React.ReactNode
  defaultOpen?: boolean
  className?: string
  buttonClassName?: string
  detailsClassName?: string
  showLabel?: boolean
  openLabel?: string
  closeLabel?: string
}

/**
 * Component for expandable/collapsible content sections
 * Used in: SpecialistCard, MetadataExplorer, CharacterProfileCard, CollaborationPanel, and 2+ more
 */
export function ExpandableSection({
  preview,
  details,
  defaultOpen = false,
  className,
  buttonClassName,
  detailsClassName,
  showLabel = true,
  openLabel = 'Hide details',
  closeLabel = 'Show details'
}: ExpandableSectionProps) {
  const { isOpen, toggle } = useExpandable(defaultOpen)

  return (
    <div className={cn("space-y-2", className)}>
      {preview}

      <button
        onClick={toggle}
        className={cn(
          "text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1 transition-colors",
          buttonClassName
        )}
      >
        <svg
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        {showLabel && <span>{isOpen ? openLabel : closeLabel}</span>}
      </button>

      {isOpen && (
        <div className={cn("pt-2 border-t border-gray-100", detailsClassName)}>
          {details}
        </div>
      )}
    </div>
  )
}
