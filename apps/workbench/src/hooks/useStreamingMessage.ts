import { useState, useCallback, useRef, useEffect } from 'react'
import { handleSSE, streamPost, type StreamChunk } from '@/lib/streaming-utils'

export interface UseStreamingMessageOptions {
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
  autoStart?: boolean
}

export interface UseStreamingMessageReturn {
  content: string
  isStreaming: boolean
  error: Error | null
  start: (url: string, method?: 'GET' | 'POST', body?: unknown) => Promise<void>
  stop: () => void
  reset: () => void
}

/**
 * Hook for handling streaming message content
 */
export function useStreamingMessage(
  options: UseStreamingMessageOptions = {}
): UseStreamingMessageReturn {
  const { onComplete, onError } = options
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleChunk = useCallback((chunk: StreamChunk) => {
    if (chunk.error) {
      setError(new Error(chunk.error))
      setIsStreaming(false)
      return
    }

    if (chunk.done) {
      setIsStreaming(false)
      return
    }

    setContent(prev => prev + chunk.content)
  }, [])

  const start = useCallback(async (
    url: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ) => {
    setContent('')
    setError(null)
    setIsStreaming(true)

    abortControllerRef.current = new AbortController()

    try {
      let fullContent: string

      if (method === 'POST') {
        fullContent = await streamPost(url, body, {
          onChunk: handleChunk,
          onComplete,
          onError,
          signal: abortControllerRef.current.signal
        })
      } else {
        fullContent = await handleSSE(url, {
          onChunk: handleChunk,
          onComplete,
          onError,
          signal: abortControllerRef.current.signal
        })
      }

      setContent(fullContent)
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
    } finally {
      setIsStreaming(false)
    }
  }, [handleChunk, onComplete, onError])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    stop()
    setContent('')
    setError(null)
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    content,
    isStreaming,
    error,
    start,
    stop,
    reset
  }
}
