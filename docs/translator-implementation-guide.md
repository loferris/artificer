# Translator Component Implementation Guide

## Quick Start

This guide provides concrete implementation steps for building the Translator component library based on the abstraction analysis.

## Prerequisites

1. **Project Setup**
   - React 18+
   - TypeScript
   - Tailwind CSS
   - Next.js 15+

2. **Dependencies to Install**
   ```bash
   # If not using shadcn/ui, install these:
   npm install class-variance-authority clsx tailwind-merge
   npm install @radix-ui/react-tabs @radix-ui/react-dialog
   npm install lucide-react  # for icons

   # For diff algorithm
   npm install diff

   # For copy to clipboard
   # (use native Clipboard API, no dependency needed)
   ```

## Phase 1: Foundation Setup

### Step 1: Create Base UI Components Directory

```bash
mkdir -p src/components/ui
mkdir -p src/components/shared
mkdir -p src/components/translator/{core,comparison,metadata,analytics,utilities}
mkdir -p src/lib
mkdir -p src/hooks
```

### Step 2: Set up Utilities First

#### `lib/cn.ts` - Class name utility
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

#### `lib/specialist-theme.ts` - Theme system
```typescript
export type SpecialistType =
  | 'cultural_specialist'
  | 'prose_stylist'
  | 'dialogue_specialist'
  | 'narrative_specialist'
  | 'fluency_optimizer'
  | 'final_synthesis'

export interface SpecialistTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
  tagline: string
}

export const specialistTheme: Record<SpecialistType, SpecialistTheme> = {
  cultural_specialist: {
    icon: '🌏',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Cultural Specialist',
    tagline: 'Preserves cultural authenticity'
  },
  prose_stylist: {
    icon: '✍️',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    label: 'Prose Stylist',
    tagline: 'Polished, literary prose'
  },
  dialogue_specialist: {
    icon: '💬',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    label: 'Dialogue Specialist',
    tagline: 'Natural conversation flow'
  },
  narrative_specialist: {
    icon: '📖',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    label: 'Narrative Specialist',
    tagline: 'Story momentum and pacing'
  },
  fluency_optimizer: {
    icon: '🎯',
    color: 'pink',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-700',
    label: 'Fluency Optimizer',
    tagline: 'Readability and clarity'
  },
  final_synthesis: {
    icon: '✨',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    label: 'Senior Editor',
    tagline: 'Final synthesis'
  }
}

export function getSpecialistTheme(type: SpecialistType): SpecialistTheme {
  return specialistTheme[type]
}
```

#### `hooks/use-copy-to-clipboard.ts`
```typescript
import { useState, useCallback } from 'react'

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      throw error
    }
  }, [])

  return { copy, copied }
}
```

#### `hooks/use-expandable.ts`
```typescript
import { useState, useCallback } from 'react'

export function useExpandable(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, toggle, open, close }
}
```

### Step 3: Core UI Components

#### `components/ui/badge.tsx`
```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        blue: "border-blue-200 bg-blue-50 text-blue-700",
        purple: "border-purple-200 bg-purple-50 text-purple-700",
        green: "border-green-200 bg-green-50 text-green-700",
        orange: "border-orange-200 bg-orange-50 text-orange-700",
        pink: "border-pink-200 bg-pink-50 text-pink-700",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
        gray: "border-gray-200 bg-gray-50 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

#### `components/ui/card.tsx`
```typescript
import * as React from "react"
import { cn } from "@/lib/cn"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

#### `components/ui/progress.tsx`
```typescript
import * as React from "react"
import { cn } from "@/lib/cn"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'blue' | 'purple' | 'green'
  animated?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, variant = 'default', animated = false, ...props }, ref) => {
    const colors = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-200",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            colors[variant],
            animated && "animate-pulse"
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
```

## Phase 2: Shared Components

### `components/shared/copy-button.tsx`
```typescript
import React from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/cn'

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard()

  return (
    <button
      onClick={() => copy(text)}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md",
        "border border-gray-200 hover:bg-gray-50",
        "transition-colors",
        copied && "bg-green-50 border-green-200 text-green-700",
        className
      )}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}
```

### `components/shared/status-badge.tsx`
```typescript
import React from 'react'
import { Badge } from '@/components/ui/badge'

export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'retry'

interface StatusBadgeProps {
  status: Status
  animated?: boolean
}

const statusConfig: Record<Status, { label: string; variant: string; icon: string }> = {
  pending: { label: 'Pending', variant: 'gray', icon: '⏹' },
  running: { label: 'Running', variant: 'blue', icon: '⏳' },
  completed: { label: 'Completed', variant: 'green', icon: '✓' },
  failed: { label: 'Failed', variant: 'destructive', icon: '✗' },
  retry: { label: 'Retrying', variant: 'orange', icon: '🔄' },
}

export function StatusBadge({ status, animated = false }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant as any}
      className={animated && status === 'running' ? 'animate-pulse' : ''}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  )
}
```

### `components/shared/expandable-section.tsx`
```typescript
import React from 'react'
import { useExpandable } from '@/hooks/use-expandable'
import { cn } from '@/lib/cn'

interface ExpandableSectionProps {
  preview: React.ReactNode
  details: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function ExpandableSection({
  preview,
  details,
  defaultOpen = false,
  className
}: ExpandableSectionProps) {
  const { isOpen, toggle } = useExpandable(defaultOpen)

  return (
    <div className={cn("space-y-2", className)}>
      <div>{preview}</div>

      <button
        onClick={toggle}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
      >
        <svg
          className={cn(
            "w-3 h-3 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span>{isOpen ? 'Hide details' : 'Show details'}</span>
      </button>

      {isOpen && (
        <div className="pt-2 border-t border-gray-100">
          {details}
        </div>
      )}
    </div>
  )
}
```

### `components/shared/badge-group.tsx`
```typescript
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

interface BadgeItem {
  label: string
  variant?: string
  icon?: string
}

interface BadgeGroupProps {
  items: BadgeItem[]
  max?: number
  showMore?: boolean
  className?: string
}

export function BadgeGroup({ items, max, showMore = false, className }: BadgeGroupProps) {
  const [showAll, setShowAll] = React.useState(false)

  const displayItems = max && !showAll ? items.slice(0, max) : items
  const remainingCount = items.length - (max || items.length)

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayItems.map((item, index) => (
        <Badge key={index} variant={item.variant as any}>
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </Badge>
      ))}

      {showMore && remainingCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          +{remainingCount} more
        </button>
      )}
    </div>
  )
}
```

## Phase 3: Translator Core Components

### `components/translator/core/pipeline-progress.tsx`
```typescript
import React from 'react'
import { Progress } from '@/components/ui/progress'
import { StatusBadge, type Status } from '@/components/shared/status-badge'
import { cn } from '@/lib/cn'

export interface PipelineStage {
  id: string
  label: string
  status: Status
}

export interface PipelineProgressProps {
  stages: PipelineStage[]
  currentStage: string
  progress: number
  estimatedTimeRemaining?: number
  className?: string
}

export function PipelineProgress({
  stages,
  currentStage,
  progress,
  estimatedTimeRemaining,
  className
}: PipelineProgressProps) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-2xl shadow-sm p-4", className)}>
      {/* Stage indicators */}
      <div className="flex items-center justify-between mb-4">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center gap-2">
              <StatusBadge
                status={stage.status}
                animated={stage.id === currentStage}
              />
              <span className="text-xs text-gray-600">{stage.label}</span>
            </div>

            {index < stages.length - 1 && (
              <div className="flex-1 h-px bg-gray-200 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} variant="blue" />
      </div>

      {/* Time estimate */}
      {estimatedTimeRemaining !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          Estimated time remaining: {formatSeconds(estimatedTimeRemaining)}
        </div>
      )}
    </div>
  )
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}
```

### `components/translator/core/specialist-card.tsx`
```typescript
import React from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { getSpecialistTheme, type SpecialistType } from '@/lib/specialist-theme'
import { CopyButton } from '@/components/shared/copy-button'
import { BadgeGroup } from '@/components/shared/badge-group'
import { ExpandableSection } from '@/components/shared/expandable-section'
import { cn } from '@/lib/cn'

export interface SpecialistCardProps {
  specialist: SpecialistType
  translation: string
  processingTime?: number
  cost?: number
  rating?: number
  insights?: string[]
  onRate?: (rating: number) => void
  className?: string
}

export function SpecialistCard({
  specialist,
  translation,
  processingTime,
  cost,
  rating,
  insights = [],
  onRate,
  className
}: SpecialistCardProps) {
  const theme = getSpecialistTheme(specialist)

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className={cn("border-b-2", theme.borderColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{theme.icon}</span>
            <div>
              <h3 className="font-semibold">{theme.label}</h3>
              <p className="text-xs text-gray-600">{theme.tagline}</p>
            </div>
          </div>
          <CopyButton text={translation} />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="text-sm text-gray-900 mb-3 whitespace-pre-wrap">
          {translation}
        </div>

        {insights.length > 0 && (
          <ExpandableSection
            preview={
              <div className="text-xs text-gray-600">
                {insights.length} insights
              </div>
            }
            details={
              <ul className="text-xs text-gray-600 space-y-1">
                {insights.map((insight, i) => (
                  <li key={i}>• {insight}</li>
                ))}
              </ul>
            }
          />
        )}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <BadgeGroup
          items={[
            processingTime && { label: `${processingTime}ms`, variant: 'gray' },
            cost && { label: `$${cost.toFixed(4)}`, variant: 'gray' },
            rating && { label: `${rating}/5 ⭐`, variant: 'gray' },
          ].filter(Boolean) as any}
        />
      </CardFooter>
    </Card>
  )
}
```

## Testing Examples

### Example Usage: Pipeline Progress
```typescript
import { PipelineProgress } from '@/components/translator/core/pipeline-progress'

function Example() {
  return (
    <PipelineProgress
      stages={[
        { id: 'cleanup', label: 'Cleanup', status: 'completed' },
        { id: 'tagging', label: 'Tagging', status: 'completed' },
        { id: 'refinement', label: 'Refinement', status: 'running' },
        { id: 'translation', label: 'Translation', status: 'pending' },
      ]}
      currentStage="refinement"
      progress={66}
      estimatedTimeRemaining={45}
    />
  )
}
```

### Example Usage: Specialist Card
```typescript
import { SpecialistCard } from '@/components/translator/core/specialist-card'

function Example() {
  return (
    <SpecialistCard
      specialist="cultural_specialist"
      translation="She bowed deeply to show respect for the elder."
      processingTime={1234}
      cost={0.008}
      rating={4.5}
      insights={[
        "Preserved honorific '님'",
        "Translated 양반 as 'yangban (nobleman)'"
      ]}
    />
  )
}
```

## Next Steps

1. **Implement Phase 1** - Foundation and utilities
2. **Test abstractions** - Build small examples
3. **Iterate** - Refine based on actual usage
4. **Build Phase 2** - Shared components
5. **Build Phase 3** - Feature components
6. **Document** - Add Storybook or doc site
7. **Deploy** - Integrate with Translator

## Resources

- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [Class Variance Authority](https://cva.style)
- [diff library](https://www.npmjs.com/package/diff)

---

**Created:** 2025-11-17
**Status:** Implementation Guide
**Dependencies:** See abstraction strategy document
