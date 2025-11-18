import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('StreamingMessage')

export interface StreamingMessageProps {
  content: string
  status: 'streaming' | 'complete' | 'error'
  messageRole?: 'user' | 'assistant' | 'system'
  showCursor?: boolean
  cursorChar?: string
  error?: string
  className?: string
  onComplete?: () => void
}

/**
 * Display a streaming message with animated cursor
 *
 * Features:
 * - Animated typing cursor during streaming
 * - Role-based styling (user/assistant/system)
 * - Error state handling
 * - Smooth content updates
 * - Lifecycle logging
 */
export function StreamingMessage({
  content,
  status,
  messageRole = 'assistant',
  showCursor = true,
  cursorChar = '▋',
  error,
  className,
  onComplete
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState(content)
  const [previousStatus, setPreviousStatus] = useState(status)

  useEffect(() => {
    logger.lifecycle('StreamingMessage', 'mount', {
      messageRole,
      status,
      contentLength: content.length
    })

    return () => {
      logger.lifecycle('StreamingMessage', 'unmount')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount/unmount for lifecycle logging

  // Update displayed content when content changes
  useEffect(() => {
    setDisplayedContent(content)
  }, [content])

  // Handle status changes
  useEffect(() => {
    if (status === 'complete' && previousStatus === 'streaming') {
      logger.info('Streaming complete', {
        component: 'StreamingMessage'
      }, {
        finalLength: content.length
      })
      onComplete?.()
    }
    setPreviousStatus(status)
  }, [status, previousStatus, content.length, onComplete])

  const isStreaming = status === 'streaming'
  const isError = status === 'error'

  const roleStyles = {
    user: 'bg-blue-50 border-blue-200 text-blue-900',
    assistant: 'bg-white border-gray-200 text-gray-900',
    system: 'bg-gray-100 border-gray-300 text-gray-700'
  }

  return (
    <Card
      className={cn(
        'transition-all',
        roleStyles[messageRole],
        isError && 'border-red-300 bg-red-50',
        className
      )}
    >
      <CardContent className="py-4">
        {isError && error ? (
          <div className="flex items-start gap-2">
            <span className="text-red-600 text-lg">⚠️</span>
            <div>
              <div className="text-sm font-medium text-red-900 mb-1">Error</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            <span>{displayedContent}</span>
            {isStreaming && showCursor && (
              <span className="inline-block ml-0.5 animate-pulse text-blue-600">
                {cursorChar}
              </span>
            )}
          </div>
        )}

        {/* Role indicator */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span className="capitalize">{role}</span>
          {isStreaming && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="animate-pulse">●</span>
                Streaming...
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
