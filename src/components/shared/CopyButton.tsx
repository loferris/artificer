import React from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export interface CopyButtonProps {
  text: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  className?: string
  showLabel?: boolean
}

/**
 * Button component for copying text to clipboard
 * Used in: CandidateComparison, SpecialistCard, CandidateDiff, ExportDialog, and 4+ more
 */
export function CopyButton({
  text,
  variant = 'outline',
  size = 'sm',
  className,
  showLabel = true
}: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => copy(text)}
      className={cn(
        copied && "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
        className
      )}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {showLabel && <span>Copied!</span>}
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {showLabel && <span>Copy</span>}
        </>
      )}
    </Button>
  )
}
