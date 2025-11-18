/**
 * Artificer UI - Grouped List Component
 *
 * Generic component for displaying items grouped by a key
 * Supports theming, filtering, sorting, and custom rendering
 */

import React, { useMemo, ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { Theme } from '../types'
import type { ThemeRegistry } from '../theme/core'
import { createComponentLogger } from '../lib/componentLogger'

const logger = createComponentLogger('GroupedList')

export interface GroupedListProps<T, K extends string> {
  /**
   * Items to display
   */
  items: T[]

  /**
   * Function to extract group key from an item
   */
  groupBy: (item: T) => K

  /**
   * Render function for group header
   * @param groupKey - The key for this group
   * @param items - Items in this group
   * @param theme - Theme for this group (if themeRegistry provided)
   */
  renderGroup: (groupKey: K, items: T[], theme?: Theme<K>) => ReactNode

  /**
   * Render function for individual items
   * @param item - The item to render
   * @param groupKey - The group this item belongs to
   * @param index - Index within the group
   */
  renderItem: (item: T, groupKey: K, index: number) => ReactNode

  /**
   * Optional theme registry for group theming
   */
  groupThemes?: ThemeRegistry<K>

  /**
   * Optional sorting function for groups
   */
  sortGroups?: (a: K, b: K) => number

  /**
   * Optional filter function for groups
   */
  filterGroups?: (groupKey: K, items: T[]) => boolean

  /**
   * Optional sorting function for items within groups
   */
  sortItems?: (a: T, b: T, groupKey: K) => number

  /**
   * Empty state component when no items
   */
  emptyState?: ReactNode

  /**
   * Empty group component when group is filtered out
   */
  emptyGroup?: (groupKey: K) => ReactNode

  /**
   * Additional className for container
   */
  className?: string

  /**
   * Gap between groups
   */
  groupGap?: 'sm' | 'md' | 'lg'

  /**
   * Gap between items within groups
   */
  itemGap?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show group count
   */
  showGroupCount?: boolean

  /**
   * Callback when group is clicked (for analytics/logging)
   */
  onGroupClick?: (groupKey: K) => void

  /**
   * Callback when item is clicked (for analytics/logging)
   */
  onItemClick?: (item: T, groupKey: K) => void
}

const gapClasses = {
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6'
}

/**
 * Generic grouped list component
 *
 * Displays items grouped by a key with theme support and custom rendering.
 * Eliminates 6+ custom grouping implementations across the codebase.
 *
 * @example
 * ```tsx
 * <GroupedList
 *   items={operations}
 *   groupBy={op => op.intent}
 *   groupThemes={operationThemes}
 *   renderGroup={(intent, items, theme) => (
 *     <div className={theme?.bgColor}>
 *       {theme?.icon} {theme?.label} ({items.length})
 *     </div>
 *   )}
 *   renderItem={(op) => <OperationCard {...op} />}
 * />
 * ```
 */
export function GroupedList<T, K extends string>({
  items,
  groupBy,
  renderGroup,
  renderItem,
  groupThemes,
  sortGroups,
  filterGroups,
  sortItems,
  emptyState,
  emptyGroup,
  className,
  groupGap = 'md',
  itemGap = 'sm',
  showGroupCount = false,
  onGroupClick,
  onItemClick
}: GroupedListProps<T, K>) {
  // Group items
  const grouped = useMemo(() => {
    const result = new Map<K, T[]>()

    items.forEach(item => {
      const key = groupBy(item)
      if (!result.has(key)) {
        result.set(key, [])
      }
      result.get(key)!.push(item)
    })

    // Sort items within each group
    if (sortItems) {
      result.forEach((groupItems, key) => {
        groupItems.sort((a, b) => sortItems(a, b, key))
      })
    }

    logger.info('Items grouped', {
      component: 'GroupedList'
    }, {
      totalItems: items.length,
      groupCount: result.size,
      groups: Array.from(result.keys())
    })

    return result
  }, [items, groupBy, sortItems])

  // Get and filter group keys
  let groupKeys = Array.from(grouped.keys())

  if (filterGroups) {
    groupKeys = groupKeys.filter(key => {
      const groupItems = grouped.get(key)!
      return filterGroups(key, groupItems)
    })
  }

  if (sortGroups) {
    groupKeys.sort(sortGroups)
  }

  // Handle empty state
  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        {emptyState || (
          <div className="text-gray-500 text-sm">No items to display</div>
        )}
      </div>
    )
  }

  if (groupKeys.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        {emptyState || (
          <div className="text-gray-500 text-sm">No groups match the filter</div>
        )}
      </div>
    )
  }

  const handleGroupClick = (groupKey: K) => {
    logger.interaction({
      component: 'GroupedList',
      action: 'group_click',
      metadata: { groupKey }
    })
    onGroupClick?.(groupKey)
  }

  const handleItemClick = (item: T, groupKey: K) => {
    logger.interaction({
      component: 'GroupedList',
      action: 'item_click',
      metadata: { groupKey }
    })
    onItemClick?.(item, groupKey)
  }

  return (
    <div className={cn(gapClasses[groupGap], className)}>
      {groupKeys.map(groupKey => {
        const groupItems = grouped.get(groupKey)!
        const theme = groupThemes?.get(groupKey)

        if (groupItems.length === 0 && emptyGroup) {
          return (
            <div key={groupKey}>
              {emptyGroup(groupKey)}
            </div>
          )
        }

        return (
          <div key={groupKey} className="group-container">
            {/* Group Header */}
            <div
              onClick={() => handleGroupClick(groupKey)}
              className={cn(
                onGroupClick && 'cursor-pointer hover:opacity-80 transition-opacity'
              )}
            >
              {renderGroup(groupKey, groupItems, theme)}
            </div>

            {/* Group Items */}
            <div className={cn(gapClasses[itemGap], 'mt-3')}>
              {groupItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleItemClick(item, groupKey)}
                  className={cn(
                    onItemClick && 'cursor-pointer'
                  )}
                >
                  {renderItem(item, groupKey, index)}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
