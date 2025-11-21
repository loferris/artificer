import { useState, useCallback } from 'react'

/**
 * Hook for managing expandable/collapsible state
 *
 * @param defaultOpen - Initial expanded state
 * @returns Object with state and control functions
 */
export function useExpandable(defaultOpen: boolean = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const set = useCallback((value: boolean) => {
    setIsOpen(value)
  }, [])

  return {
    isOpen,
    toggle,
    open,
    close,
    set
  }
}

export interface UseExpandableReturn {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
  set: (value: boolean) => void
}

/**
 * Hook for managing multiple expandable sections
 *
 * @param defaultOpenIds - Array of IDs that should be open by default
 * @returns Object with state and control functions
 */
export function useMultiExpandable(defaultOpenIds: string[] = []) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds))

  const toggle = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const open = useCallback((id: string) => {
    setOpenIds(prev => new Set(prev).add(id))
  }, [])

  const close = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isOpen = useCallback((id: string) => {
    return openIds.has(id)
  }, [openIds])

  const openAll = useCallback((ids: string[]) => {
    setOpenIds(new Set(ids))
  }, [])

  const closeAll = useCallback(() => {
    setOpenIds(new Set())
  }, [])

  return {
    openIds,
    toggle,
    open,
    close,
    isOpen,
    openAll,
    closeAll
  }
}

export interface UseMultiExpandableReturn {
  openIds: Set<string>
  toggle: (id: string) => void
  open: (id: string) => void
  close: (id: string) => void
  isOpen: (id: string) => boolean
  openAll: (ids: string[]) => void
  closeAll: () => void
}
