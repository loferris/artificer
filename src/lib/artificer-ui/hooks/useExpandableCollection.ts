/**
 * Artificer UI - Expandable Collection Hook
 *
 * Manages expand/collapse state for collections of items
 * Supports both multi-expand and accordion (single-expand) modes
 */

import { useState, useCallback } from 'react'

export interface UseExpandableCollectionOptions {
  /**
   * Initially open item IDs
   */
  defaultOpen?: string[]

  /**
   * Accordion mode - only one item can be open at a time
   */
  singleOpen?: boolean
}

export interface UseExpandableCollectionReturn {
  /**
   * Set of currently open item IDs
   */
  openIds: Set<string>

  /**
   * Toggle an item's open state
   */
  toggle: (id: string) => void

  /**
   * Check if an item is open
   */
  isOpen: (id: string) => boolean

  /**
   * Open a specific item
   */
  open: (id: string) => void

  /**
   * Close a specific item
   */
  close: (id: string) => void

  /**
   * Open multiple items
   */
  openMany: (ids: string[]) => void

  /**
   * Close multiple items
   */
  closeMany: (ids: string[]) => void

  /**
   * Open all items from a list
   */
  openAll: (ids: string[]) => void

  /**
   * Close all items
   */
  closeAll: () => void

  /**
   * Set open state directly
   */
  setOpenIds: (ids: Set<string> | string[]) => void
}

/**
 * Hook for managing expandable collection state
 *
 * Consolidates expand/collapse logic used across ValidationPanel, OperationsList, etc.
 *
 * @example
 * ```tsx
 * const { openIds, toggle, isOpen } = useExpandableCollection({
 *   defaultOpen: ['item-1'],
 *   singleOpen: false // Allow multiple items open
 * })
 *
 * <div onClick={() => toggle(item.id)}>
 *   {isOpen(item.id) ? 'Collapse' : 'Expand'}
 * </div>
 * ```
 */
export function useExpandableCollection(
  options: UseExpandableCollectionOptions = {}
): UseExpandableCollectionReturn {
  const { defaultOpen = [], singleOpen = false } = options

  const [openIds, setOpenIdsState] = useState(new Set(defaultOpen))

  const toggle = useCallback(
    (id: string) => {
      setOpenIdsState(prev => {
        const next = new Set(prev)

        if (next.has(id)) {
          // Closing the item
          next.delete(id)
        } else {
          // Opening the item
          if (singleOpen) {
            // Accordion mode: close all others
            next.clear()
          }
          next.add(id)
        }

        return next
      })
    },
    [singleOpen]
  )

  const isOpen = useCallback(
    (id: string) => {
      return openIds.has(id)
    },
    [openIds]
  )

  const open = useCallback((id: string) => {
    setOpenIdsState(prev => {
      const next = new Set(prev)
      if (singleOpen) {
        next.clear()
      }
      next.add(id)
      return next
    })
  }, [singleOpen])

  const close = useCallback((id: string) => {
    setOpenIdsState(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const openMany = useCallback(
    (ids: string[]) => {
      setOpenIdsState(prev => {
        const next = singleOpen ? new Set() : new Set(prev)
        ids.forEach(id => next.add(id))
        return next
      })
    },
    [singleOpen]
  )

  const closeMany = useCallback((ids: string[]) => {
    setOpenIdsState(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }, [])

  const openAll = useCallback((ids: string[]) => {
    if (singleOpen) {
      // In accordion mode, open the first item only
      setOpenIdsState(new Set(ids.slice(0, 1)))
    } else {
      setOpenIdsState(new Set(ids))
    }
  }, [singleOpen])

  const closeAll = useCallback(() => {
    setOpenIdsState(new Set())
  }, [])

  const setOpenIds = useCallback((ids: Set<string> | string[]) => {
    if (Array.isArray(ids)) {
      setOpenIdsState(new Set(ids))
    } else {
      setOpenIdsState(new Set(ids))
    }
  }, [])

  return {
    openIds,
    toggle,
    isOpen,
    open,
    close,
    openMany,
    closeMany,
    openAll,
    closeAll,
    setOpenIds
  }
}
