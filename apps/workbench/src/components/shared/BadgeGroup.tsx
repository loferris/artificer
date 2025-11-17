import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

export interface BadgeItem {
  label: string
  variant?: 'default' | 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'emerald' | 'gray' | 'yellow' | 'red'
  icon?: string
}

export interface BadgeGroupProps {
  items: BadgeItem[]
  max?: number
  showMore?: boolean
  className?: string
}

/**
 * Component for displaying a group of badges with optional "show more" functionality
 * Used in: SpecialistCard, MetadataExplorer, TranslationJobCard, and 5+ more
 */
export function BadgeGroup({
  items,
  max,
  showMore = false,
  className
}: BadgeGroupProps) {
  const [showAll, setShowAll] = React.useState(false)

  const displayItems = max && !showAll ? items.slice(0, max) : items
  const remainingCount = items.length - (max || items.length)

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayItems.map((item, index) => (
        <Badge key={index} variant={item.variant}>
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </Badge>
      ))}

      {showMore && remainingCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          +{remainingCount} more
        </button>
      )}

      {showMore && showAll && items.length > (max || 0) && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  )
}
