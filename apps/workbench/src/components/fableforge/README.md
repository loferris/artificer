# FableForge Component Library

A comprehensive React component library for literary translation workflows, built with TypeScript and Tailwind CSS.

## Overview

This library provides 15+ components organized in three tiers (Atomic, Molecular, Organism) with shared utilities, hooks, and a consistent design system.

## Quick Start

```tsx
import {
  CandidateComparison,
  PipelineProgress,
  TranslationJobCard,
  SpecialistCard
} from '@/components/fableforge'

// Use the components
function MyPage() {
  return (
    <div>
      <PipelineProgress
        stages={stages}
        currentStage="refinement"
        progress={66}
        estimatedTimeRemaining={45}
      />

      <CandidateComparison
        candidates={candidates}
        finalSynthesis={synthesis}
        onRate={(id, rating) => console.log(id, rating)}
      />
    </div>
  )
}
```

## Core Components

### PipelineProgress ⭐⭐⭐

Real-time visualization of pipeline stages.

```tsx
<PipelineProgress
  stages={[
    { id: 'cleanup', label: 'Cleanup', status: 'completed' },
    { id: 'tagging', label: 'Tagging', status: 'running' },
    { id: 'translation', label: 'Translation', status: 'pending' }
  ]}
  currentStage="tagging"
  progress={50}
  estimatedTimeRemaining={120}
/>
```

**Features:**
- Multi-stage progress visualization
- Animated status indicators
- Time estimates
- Error states
- Responsive layout

### CandidateComparison ⭐⭐⭐

The killer feature - comparing 5 specialist translations side-by-side.

```tsx
<CandidateComparison
  candidates={[
    {
      id: '1',
      specialist: 'cultural_specialist',
      translation: 'She bowed deeply...',
      insights: ['Preserved cultural context...']
    },
    // ... 4 more candidates
  ]}
  finalSynthesis="Combined translation..."
  onRate={(id, rating) => {}}
  onSelect={(id) => {}}
/>
```

**Features:**
- Grid layout (2x3 or 3x2)
- Click to expand/focus
- Star rating system
- Copy to clipboard
- Insights display
- Final synthesis view

### TranslationJobCard ⭐⭐⭐

Quick overview card for jobs in a list.

```tsx
<TranslationJobCard
  job={{
    id: 'job-123',
    sourceLanguage: 'kor',
    targetLanguage: 'eng',
    status: 'completed',
    preview: 'First 100 chars...',
    createdAt: new Date(),
    progress: 100,
    candidatesCount: 5
  }}
  onClick={() => navigate(`/jobs/job-123`)}
/>
```

**Features:**
- Language flags
- Status badges
- Progress indicators
- Cost display
- Timestamps

### SpecialistCard ⭐⭐

Individual specialist translation display.

```tsx
<SpecialistCard
  specialist="prose_stylist"
  translation="Translation text..."
  processingTime={1234}
  cost={0.008}
  rating={4.5}
  insights={['Enhanced literary quality...', 'Improved flow...']}
  onRate={(rating) => {}}
/>
```

**Features:**
- Specialist-themed styling
- Expandable insights
- Copy button
- Rating system
- Processing stats

## Shared Components

### CopyButton

```tsx
<CopyButton text="Text to copy" variant="outline" size="sm" />
```

### StatusBadge

```tsx
<StatusBadge status="running" animated />
```

### BadgeGroup

```tsx
<BadgeGroup
  items={[
    { label: 'Korean', variant: 'blue', icon: '🇰🇷' },
    { label: 'Completed', variant: 'green', icon: '✓' }
  ]}
  max={5}
  showMore
/>
```

### ExpandableSection

```tsx
<ExpandableSection
  preview={<div>Preview content</div>}
  details={<div>Detailed content</div>}
  defaultOpen={false}
/>
```

## Utilities

### Specialist Theme

```tsx
import { getSpecialistTheme } from '@/lib/specialist-theme'

const theme = getSpecialistTheme('cultural_specialist')
// { icon: '🌏', color: 'blue', label: 'Cultural Specialist', ... }
```

### Time Formatting

```tsx
import { formatTimeAgo, formatDuration } from '@/lib/time-utils'

formatTimeAgo(new Date(Date.now() - 3600000)) // "1 hour ago"
formatDuration(125) // "2m 5s"
```

### Language Utils

```tsx
import { formatLanguagePair, getLanguageFlag } from '@/lib/language-utils'

formatLanguagePair('kor', 'eng', 'full') // "🇰🇷 Korean → 🇬🇧 English"
getLanguageFlag('kor') // "🇰🇷"
```

### Cost Utils

```tsx
import { formatCost, calculateTotal } from '@/lib/cost-utils'

formatCost(0.00789) // "$0.0079"
calculateTotal([{ amount: 0.01 }, { amount: 0.02 }]) // 0.03
```

### Diff Engine

```tsx
import { computeDiff, getSimilarityScore } from '@/lib/diff-engine'

const diff = computeDiff(text1, text2, 'word')
// { segments: [...], stats: { additions, deletions, ... } }

const similarity = getSimilarityScore(text1, text2) // 0-1
```

## Hooks

### useCopyToClipboard

```tsx
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

function MyComponent() {
  const { copy, copied } = useCopyToClipboard()

  return (
    <button onClick={() => copy('text')}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
```

### useExpandable

```tsx
import { useExpandable } from '@/hooks/useExpandable'

function MyComponent() {
  const { isOpen, toggle } = useExpandable(false)

  return (
    <div>
      <button onClick={toggle}>Toggle</button>
      {isOpen && <div>Content</div>}
    </div>
  )
}
```

## Specialist Types

The library supports 6 specialist types:

1. **cultural_specialist** 🌏 - Preserves cultural authenticity
2. **prose_stylist** ✍️ - Polished, literary prose
3. **dialogue_specialist** 💬 - Natural conversation flow
4. **narrative_specialist** 📖 - Story momentum and pacing
5. **fluency_optimizer** 🎯 - Readability and clarity
6. **final_synthesis** ✨ - Senior editor's combined translation

Each has consistent theming (icon, colors, labels, taglines).

## Design System

### Colors

- **Specialist Colors**: blue, purple, green, orange, pink, emerald
- **Status Colors**: gray (pending), blue (running), green (completed), red (failed), orange (retry)
- **Semantic Colors**: info, success, warning, error

### Typography

- **Headings**: text-xl to text-4xl, font-semibold to font-bold
- **Body**: text-sm, leading-relaxed
- **Captions**: text-xs, text-gray-600

### Spacing

- **Card padding**: p-6
- **Section gaps**: gap-4 to gap-6
- **Badge gaps**: gap-2

## Component Architecture

```
Tier 1 (Atomic):
  - Badge, Button, Card, Progress

Tier 2 (Molecular):
  - CopyButton, StatusBadge, BadgeGroup, ExpandableSection

Tier 3 (Organism):
  - PipelineProgress, CandidateComparison, TranslationJobCard, SpecialistCard
```

## Demo

See the full demo at `/fableforge-demo`

## Documentation

- Full abstraction strategy: `docs/fableforge-component-abstractions.md`
- Implementation guide: `docs/fableforge-implementation-guide.md`

## Development

All components are built with:
- TypeScript for type safety
- Tailwind CSS for styling
- React hooks for state management
- Accessibility in mind

## Future Components

See the component wishlist in `docs/fableforge-component-abstractions.md` for upcoming components:
- MetadataExplorer
- CandidateDiff
- QualityMetrics
- CostTracker
- And 10+ more!
