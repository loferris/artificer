import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCopyToClipboard } from '../useCopyToClipboard'

describe('useCopyToClipboard', () => {
  let mockWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('initializes with copied false and no error', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    expect(result.current.copied).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('copies text to clipboard successfully', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(mockWriteText).toHaveBeenCalledWith('test text')
    expect(result.current.copied).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('resets copied state after duration', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000))

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(result.current.copied).toBe(false)
    })
  })

  it('uses default duration of 2000ms', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1999)
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(result.current.copied).toBe(false)
    })
  })

  it('handles clipboard API errors', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard error'))

    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Clipboard error')
  })

  it('handles missing clipboard API', async () => {
    Object.assign(navigator, { clipboard: undefined })

    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Clipboard API not supported')
  })

  it('reset function clears state', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.copied).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles multiple copy operations', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('first text')
    })

    expect(mockWriteText).toHaveBeenCalledWith('first text')
    expect(result.current.copied).toBe(true)

    await act(async () => {
      await result.current.copy('second text')
    })

    expect(mockWriteText).toHaveBeenCalledWith('second text')
    expect(result.current.copied).toBe(true)
  })

  it('clears previous error on successful copy', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('First error'))

    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.error).toBeInstanceOf(Error)

    mockWriteText.mockResolvedValueOnce(undefined)

    await act(async () => {
      await result.current.copy('test text 2')
    })

    expect(result.current.error).toBeNull()
    expect(result.current.copied).toBe(true)
  })
})
