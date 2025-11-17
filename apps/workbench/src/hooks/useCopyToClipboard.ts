import { useState, useCallback } from 'react'

/**
 * Hook for copying text to clipboard with feedback
 * Used in: CandidateComparison, SpecialistCard, CandidateDiff, ExportDialog, and 4+ more components
 *
 * @param duration - How long to show the "copied" state (ms), default 2000
 * @returns Object with copy function and copied state
 */
export function useCopyToClipboard(duration: number = 2000) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        const err = new Error('Clipboard API not supported')
        setError(err)
        console.error(err)
        return
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setError(null)

        // Reset after duration
        setTimeout(() => setCopied(false), duration)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to copy')
        setError(error)
        console.error('Failed to copy:', error)
      }
    },
    [duration]
  )

  const reset = useCallback(() => {
    setCopied(false)
    setError(null)
  }, [])

  return { copy, copied, error, reset }
}
