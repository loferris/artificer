import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExpandable, useMultiExpandable } from '../useExpandable'

describe('useExpandable', () => {
  describe('basic functionality', () => {
    it('initializes with defaultOpen false', () => {
      const { result } = renderHook(() => useExpandable())

      expect(result.current.isOpen).toBe(false)
    })

    it('initializes with custom defaultOpen value', () => {
      const { result } = renderHook(() => useExpandable(true))

      expect(result.current.isOpen).toBe(true)
    })

    it('toggles open state', () => {
      const { result } = renderHook(() => useExpandable())

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('opens when calling open()', () => {
      const { result } = renderHook(() => useExpandable())

      act(() => {
        result.current.open()
      })

      expect(result.current.isOpen).toBe(true)

      // Calling open again should keep it open
      act(() => {
        result.current.open()
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('closes when calling close()', () => {
      const { result } = renderHook(() => useExpandable(true))

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)

      // Calling close again should keep it closed
      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('sets state directly with set()', () => {
      const { result } = renderHook(() => useExpandable())

      act(() => {
        result.current.set(true)
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.set(false)
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('stability', () => {
    it('maintains function reference stability', () => {
      const { result, rerender } = renderHook(() => useExpandable())

      const firstToggle = result.current.toggle
      const firstOpen = result.current.open
      const firstClose = result.current.close
      const firstSet = result.current.set

      act(() => {
        result.current.toggle()
      })

      rerender()

      expect(result.current.toggle).toBe(firstToggle)
      expect(result.current.open).toBe(firstOpen)
      expect(result.current.close).toBe(firstClose)
      expect(result.current.set).toBe(firstSet)
    })
  })
})

describe('useMultiExpandable', () => {
  describe('basic functionality', () => {
    it('initializes with empty set', () => {
      const { result } = renderHook(() => useMultiExpandable())

      expect(result.current.openIds.size).toBe(0)
    })

    it('initializes with default open IDs', () => {
      const { result } = renderHook(() => useMultiExpandable(['1', '2']))

      expect(result.current.openIds.size).toBe(2)
      expect(result.current.isOpen('1')).toBe(true)
      expect(result.current.isOpen('2')).toBe(true)
    })

    it('toggles individual items', () => {
      const { result } = renderHook(() => useMultiExpandable())

      act(() => {
        result.current.toggle('1')
      })

      expect(result.current.isOpen('1')).toBe(true)

      act(() => {
        result.current.toggle('1')
      })

      expect(result.current.isOpen('1')).toBe(false)
    })

    it('opens individual items', () => {
      const { result } = renderHook(() => useMultiExpandable())

      act(() => {
        result.current.open('1')
      })

      expect(result.current.isOpen('1')).toBe(true)

      // Opening again should keep it open
      act(() => {
        result.current.open('1')
      })

      expect(result.current.isOpen('1')).toBe(true)
    })

    it('closes individual items', () => {
      const { result } = renderHook(() => useMultiExpandable(['1', '2']))

      expect(result.current.isOpen('1')).toBe(true)

      act(() => {
        result.current.close('1')
      })

      expect(result.current.isOpen('1')).toBe(false)
      expect(result.current.isOpen('2')).toBe(true)
    })

    it('handles multiple items independently', () => {
      const { result } = renderHook(() => useMultiExpandable())

      act(() => {
        result.current.open('1')
        result.current.open('2')
        result.current.open('3')
      })

      expect(result.current.openIds.size).toBe(3)
      expect(result.current.isOpen('1')).toBe(true)
      expect(result.current.isOpen('2')).toBe(true)
      expect(result.current.isOpen('3')).toBe(true)

      act(() => {
        result.current.close('2')
      })

      expect(result.current.openIds.size).toBe(2)
      expect(result.current.isOpen('1')).toBe(true)
      expect(result.current.isOpen('2')).toBe(false)
      expect(result.current.isOpen('3')).toBe(true)
    })

    it('opens all items with openAll', () => {
      const { result } = renderHook(() => useMultiExpandable())

      act(() => {
        result.current.openAll(['1', '2', '3', '4'])
      })

      expect(result.current.openIds.size).toBe(4)
      expect(result.current.isOpen('1')).toBe(true)
      expect(result.current.isOpen('2')).toBe(true)
      expect(result.current.isOpen('3')).toBe(true)
      expect(result.current.isOpen('4')).toBe(true)
    })

    it('closes all items with closeAll', () => {
      const { result } = renderHook(() => useMultiExpandable(['1', '2', '3']))

      expect(result.current.openIds.size).toBe(3)

      act(() => {
        result.current.closeAll()
      })

      expect(result.current.openIds.size).toBe(0)
      expect(result.current.isOpen('1')).toBe(false)
      expect(result.current.isOpen('2')).toBe(false)
      expect(result.current.isOpen('3')).toBe(false)
    })

    it('replaces all open items with openAll', () => {
      const { result } = renderHook(() => useMultiExpandable(['1', '2']))

      expect(result.current.isOpen('1')).toBe(true)
      expect(result.current.isOpen('2')).toBe(true)

      act(() => {
        result.current.openAll(['3', '4'])
      })

      expect(result.current.openIds.size).toBe(2)
      expect(result.current.isOpen('1')).toBe(false)
      expect(result.current.isOpen('2')).toBe(false)
      expect(result.current.isOpen('3')).toBe(true)
      expect(result.current.isOpen('4')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined IDs gracefully', () => {
      const { result } = renderHook(() => useMultiExpandable())

      expect(result.current.isOpen('undefined-id')).toBe(false)
    })

    it('handles empty array for openAll', () => {
      const { result } = renderHook(() => useMultiExpandable(['1', '2']))

      act(() => {
        result.current.openAll([])
      })

      expect(result.current.openIds.size).toBe(0)
    })

    it('maintains function reference stability', () => {
      const { result, rerender } = renderHook(() => useMultiExpandable())

      const firstToggle = result.current.toggle
      const firstOpen = result.current.open
      const firstClose = result.current.close
      const firstIsOpen = result.current.isOpen
      const firstOpenAll = result.current.openAll
      const firstCloseAll = result.current.closeAll

      act(() => {
        result.current.toggle('1')
      })

      rerender()

      expect(result.current.toggle).toBe(firstToggle)
      expect(result.current.open).toBe(firstOpen)
      expect(result.current.close).toBe(firstClose)
      expect(result.current.isOpen).toBe(firstIsOpen)
      expect(result.current.openAll).toBe(firstOpenAll)
      expect(result.current.closeAll).toBe(firstCloseAll)
    })
  })
})
