/**
 * Streaming utilities for handling SSE and WebSocket connections
 */

export interface StreamChunk {
  content: string
  done: boolean
  error?: string
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Handle Server-Sent Events (SSE) streaming
 */
export async function handleSSE(
  url: string,
  options: StreamOptions = {}
): Promise<string> {
  const { onChunk, onComplete, onError, signal } = options
  let fullContent = ''

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onChunk?.({ content: '', done: true })
        onComplete?.(fullContent)
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            onChunk?.({ content: '', done: true })
            onComplete?.(fullContent)
            return fullContent
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.content || parsed.delta?.content || ''
            fullContent += content
            onChunk?.({ content, done: false })
          } catch (e) {
            // Not JSON, treat as raw text
            fullContent += data
            onChunk?.({ content: data, done: false })
          }
        }
      }
    }

    return fullContent
  } catch (error) {
    const err = error as Error
    onError?.(err)
    onChunk?.({ content: '', done: true, error: err.message })
    throw err
  }
}

/**
 * Handle POST request with streaming response
 */
export async function streamPost(
  url: string,
  body: unknown,
  options: StreamOptions = {}
): Promise<string> {
  const { onChunk, onComplete, onError, signal } = options
  let fullContent = ''

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onChunk?.({ content: '', done: true })
        onComplete?.(fullContent)
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            onChunk?.({ content: '', done: true })
            onComplete?.(fullContent)
            return fullContent
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.content || parsed.delta?.content || ''
            fullContent += content
            onChunk?.({ content, done: false })
          } catch (e) {
            // Not JSON, treat as raw text
            fullContent += data
            onChunk?.({ content: data, done: false })
          }
        }
      }
    }

    return fullContent
  } catch (error) {
    const err = error as Error
    onError?.(err)
    onChunk?.({ content: '', done: true, error: err.message })
    throw err
  }
}

/**
 * Simulate streaming for development/testing
 */
export async function simulateStreaming(
  text: string,
  options: StreamOptions & { delayMs?: number; wordByWord?: boolean } = {}
): Promise<string> {
  const { onChunk, onComplete, delayMs = 50, wordByWord = false } = options

  if (wordByWord) {
    const words = text.split(' ')
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '')
      await new Promise(resolve => setTimeout(resolve, delayMs))
      onChunk?.({ content: word, done: false })
    }
  } else {
    for (const char of text) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      onChunk?.({ content: char, done: false })
    }
  }

  onChunk?.({ content: '', done: true })
  onComplete?.(text)
  return text
}

/**
 * Create an abort controller with timeout
 */
export function createAbortController(timeoutMs?: number): AbortController {
  const controller = new AbortController()

  if (timeoutMs) {
    setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeoutMs}ms`))
    }, timeoutMs)
  }

  return controller
}
