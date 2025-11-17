# FableForge Component Abstraction Strategy

## Executive Summary

Analysis of 17 FableForge component requests reveals **5 major abstraction patterns** that can reduce development time by ~60% and ensure consistency across the UI.

## Core Abstraction Patterns

### 1. Progress & Status System
**Impact: 6+ components**

Components affected:
- PipelineProgress ⭐⭐⭐
- TranslationJobCard ⭐⭐⭐
- QualityMetrics
- CostTracker
- TranslationTimeline
- ABTestComparison

**Shared Requirements:**
- Multi-stage progress visualization
- Status indicators (pending, running, complete, failed, retry)
- Progress bars with percentage
- Time estimates
- Animated states
- Color coding by stage
- Error states

**Proposed Abstractions:**
```typescript
// ui/progress.tsx
<Progress value={66} variant="success" animated />

// components/stage-indicator.tsx
<StageIndicator
  stages={['cleanup', 'tagging', 'refinement']}
  current="refinement"
  status="running"
/>

// components/status-badge.tsx
<StatusBadge status="running" animated />
```

### 2. Comparison & Diff Engine
**Impact: 4 components**

Components affected:
- CandidateComparison ⭐⭐⭐
- CandidateDiff ⭐⭐
- InteractiveDiff 🚀
- ABTestComparison 🚀

**Shared Requirements:**
- Text diffing (word, sentence, paragraph level)
- Side-by-side vs unified view
- Highlight additions, deletions, changes
- Grid layout for multiple candidates
- Interactive selection
- Copy/export functionality
- Click to expand/focus
- Visual comparison indicators

**Proposed Abstractions:**
```typescript
// lib/diff-engine.ts
export function computeDiff(
  textA: string,
  textB: string,
  granularity: 'word' | 'sentence' | 'paragraph'
): DiffResult

// components/diff-viewer.tsx
<DiffViewer
  left={text1}
  right={text2}
  mode="side-by-side" // or "unified"
  highlightLevel="word"
/>

// components/comparison-grid.tsx
<ComparisonGrid
  items={candidates}
  columns={3}
  onSelect={(id) => {}}
  renderItem={(item) => <CandidateCard {...item} />}
/>
```

### 3. Card System with Actions
**Impact: 8+ components**

Components affected:
- TranslationJobCard ⭐⭐⭐
- SpecialistCard ⭐⭐
- CharacterProfileCard
- All metadata display cards
- QualityMetrics
- CostTracker cards

**Shared Requirements:**
- Consistent card styling
- Header with icon/avatar/emoji
- Title and subtitle
- Content area with badges
- Action buttons (copy, rate, expand, select)
- Expandable details section
- Footer with metadata
- Hover states
- Click handlers

**Proposed Abstractions:**
```typescript
// ui/card.tsx - Base from shadcn/ui
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>

// components/action-card.tsx
<ActionCard
  icon="🌏"
  title="Cultural Specialist"
  subtitle="Preserves cultural authenticity"
  badges={[<Badge>Korean</Badge>]}
  actions={[
    { label: "Copy", onClick: handleCopy },
    { label: "Rate", onClick: handleRate }
  ]}
  expandable={{
    preview: "Short preview...",
    details: <DetailContent />
  }}
/>

// components/specialist-theme.ts
export const specialistTheme = {
  cultural_specialist: {
    icon: '🌏',
    color: 'blue',
    label: 'Cultural Specialist',
    tagline: 'Preserves cultural authenticity'
  },
  // ... other specialists
}
```

### 4. Metadata Display System
**Impact: 5 components**

Components affected:
- MetadataExplorer ⭐⭐
- CharacterProfileCard
- SpecialistCard ⭐⭐
- TranslationJobCard ⭐⭐⭐
- QualityMetrics

**Shared Requirements:**
- Key-value pair display
- Badge/tag groups
- Nested object visualization
- Tab navigation for categories
- Expandable sections
- Search/filter within metadata
- Copy individual values
- Icons for metadata types

**Proposed Abstractions:**
```typescript
// components/metadata-panel.tsx
<MetadataPanel
  data={{
    character_profiles: { ... },
    cultural_terms: { ... }
  }}
  tabs={['Characters', 'Cultural Terms', 'Relationships']}
  searchable
  expandable
/>

// components/badge-group.tsx
<BadgeGroup
  items={[
    { label: 'Complexity: 8/10', variant: 'blue' },
    { label: 'Korean', variant: 'purple' }
  ]}
  max={5}
  showMore
/>

// components/key-value-list.tsx
<KeyValueList
  items={[
    { key: 'Model', value: 'claude-4.5', copyable: true },
    { key: 'Cost', value: '$0.008' }
  ]}
/>
```

### 5. Modal & Dialog System
**Impact: 4 components**

Components affected:
- ExportDialog
- BatchUpload
- CollaborationPanel 🚀
- PromptEditor 🚀

**Shared Requirements:**
- Modal overlay
- Form inputs
- File uploads
- Multi-step flows
- Preview modes
- Action buttons (cancel, confirm)
- Validation
- Loading states

**Proposed Abstractions:**
```typescript
// ui/dialog.tsx - Base from shadcn/ui
<Dialog>
  <DialogTrigger />
  <DialogContent>
    <DialogHeader />
    <DialogBody />
    <DialogFooter />
  </DialogContent>
</Dialog>

// components/export-dialog.tsx
<ExportDialog
  formats={['txt', 'docx', 'json', 'md']}
  options={{
    includeCandidates: true,
    includeMetadata: true
  }}
  onExport={(format, options) => {}}
/>

// components/upload-dialog.tsx
<UploadDialog
  accept={['.txt', '.docx', '.pdf']}
  maxFiles={50}
  onUpload={(files) => {}}
  preview
/>
```

## Shared Utilities & Hooks

### Hooks
```typescript
// hooks/use-copy-to-clipboard.ts
// Used in: 8+ components
export function useCopyToClipboard(): {
  copy: (text: string) => Promise<void>
  copied: boolean
}

// hooks/use-expandable.ts
// Used in: 6+ components
export function useExpandable(defaultOpen = false): {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// hooks/use-keyboard-shortcuts.ts
// Used in: Comparison views
export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>
): void
```

### Utilities
```typescript
// lib/time-utils.ts
export function formatTimeAgo(date: Date): string
export function formatDuration(seconds: number): string
export function estimateTime(progress: number, elapsed: number): number

// lib/language-utils.ts
export function getLanguageFlag(code: string): string
export function getLanguageName(code: string): string
export function formatLanguagePair(source: string, target: string): string

// lib/cost-utils.ts
export function formatCost(amount: number): string
export function calculateTotal(items: CostItem[]): number
export function compareCosts(a: number, b: number): string
```

## Component Library Structure

```
src/
├── components/
│   ├── ui/                          # Tier 1: Atomic (shadcn/ui)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── progress.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   │
│   ├── shared/                      # Tier 2: Molecular (reusable)
│   │   ├── status-indicator.tsx
│   │   ├── metric-display.tsx
│   │   ├── badge-group.tsx
│   │   ├── expandable-section.tsx
│   │   ├── action-card.tsx
│   │   ├── copy-button.tsx
│   │   ├── rating.tsx
│   │   └── key-value-list.tsx
│   │
│   └── fableforge/                  # Tier 3: Organism (feature-specific)
│       ├── core/
│       │   ├── candidate-comparison.tsx        ⭐⭐⭐
│       │   ├── pipeline-progress.tsx           ⭐⭐⭐
│       │   ├── translation-job-card.tsx        ⭐⭐⭐
│       │   ├── specialist-card.tsx             ⭐⭐
│       │   └── stage-progress.tsx
│       │
│       ├── comparison/
│       │   ├── candidate-diff.tsx              ⭐⭐
│       │   ├── diff-viewer.tsx
│       │   ├── comparison-grid.tsx
│       │   └── interactive-diff.tsx            🚀
│       │
│       ├── metadata/
│       │   ├── metadata-explorer.tsx           ⭐⭐
│       │   ├── character-profile-card.tsx
│       │   ├── cultural-terms-glossary.tsx
│       │   └── metadata-panel.tsx
│       │
│       ├── analytics/
│       │   ├── quality-metrics.tsx
│       │   ├── cost-tracker.tsx
│       │   └── translation-timeline.tsx
│       │
│       ├── utilities/
│       │   ├── export-dialog.tsx
│       │   ├── batch-upload.tsx
│       │   └── translation-memory-search.tsx   🚀
│       │
│       └── collaboration/
│           ├── collaboration-panel.tsx         🚀
│           └── prompt-editor.tsx               🚀
│
├── lib/
│   ├── diff-engine.ts              # Text diff algorithm
│   ├── time-utils.ts
│   ├── language-utils.ts
│   └── cost-utils.ts
│
└── hooks/
    ├── use-copy-to-clipboard.ts
    ├── use-expandable.ts
    └── use-keyboard-shortcuts.ts
```

## Design System

### Color Palette
```typescript
// Specialist colors - used across 8+ components
export const specialistColors = {
  cultural_specialist: 'blue',      // 🌏 Cultural Specialist
  prose_stylist: 'purple',          // ✍️ Prose Stylist
  dialogue_specialist: 'green',     // 💬 Dialogue Specialist
  narrative_specialist: 'orange',   // 📖 Narrative Specialist
  fluency_optimizer: 'pink',        // 🎯 Fluency Optimizer
  final_synthesis: 'emerald'        // Senior Editor
}

// Status colors - used across 6+ components
export const statusColors = {
  pending: 'gray',
  running: 'blue',
  complete: 'green',
  failed: 'red',
  retry: 'orange'
}

// Metric ranges
export const metricColors = {
  poor: 'red',      // 0-0.5
  fair: 'orange',   // 0.5-0.7
  good: 'yellow',   // 0.7-0.85
  excellent: 'green' // 0.85-1.0
}
```

### Typography
```typescript
// Headings
h1: 'text-2xl font-bold'
h2: 'text-xl font-semibold'
h3: 'text-lg font-semibold'
h4: 'text-base font-medium'

// Body
body: 'text-sm'
bodyEmphasis: 'text-sm font-medium'

// Metadata
caption: 'text-xs text-gray-600'
code: 'text-xs font-mono'
```

### Spacing
```typescript
cardPadding: 'p-4'
cardGap: 'gap-4'
badgeGap: 'gap-2'
sectionMargin: 'mb-6'
```

### Animation
```typescript
pulse: 'animate-pulse'
fadeIn: 'animate-fade-in'
slideIn: 'animate-slide-in'
progressSmooth: 'transition-all duration-300 ease-out'
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal: Set up base infrastructure**

1. Install/verify shadcn/ui components
   - Badge, Button, Card, Dialog, Progress, Tabs

2. Create specialist theme system
   - `lib/specialist-theme.ts`
   - Icons, colors, labels, taglines

3. Build Tier 1 atomic components
   - CopyButton (with toast notification)
   - Rating (star system)
   - Custom Badge variants

4. Implement core hooks
   - `use-copy-to-clipboard.ts`
   - `use-expandable.ts`

5. Create utility functions
   - `time-utils.ts`
   - `language-utils.ts`
   - `cost-utils.ts`

**Deliverables:**
- ✅ Base UI components installed
- ✅ Theme system defined
- ✅ Core hooks working
- ✅ Utility functions tested

### Phase 2: Molecular Components (Week 2)
**Goal: Build reusable composite components**

6. Status & Progress Components
   - StatusIndicator
   - StageProgress
   - MetricDisplay

7. Diff Engine & Viewer
   - `lib/diff-engine.ts` (algorithm)
   - DiffViewer component
   - DiffHighlighter utility

8. Card System
   - ActionCard
   - ExpandableSection
   - BadgeGroup
   - KeyValueList

9. Layout Components
   - ComparisonGrid
   - ResponsiveGrid
   - TabPanel

**Deliverables:**
- ✅ Tier 2 components built
- ✅ Diff engine working
- ✅ Grid layouts responsive
- ✅ Storybook examples (optional)

### Phase 3: FableForge Core (Week 3)
**Goal: Build must-have components**

10. PipelineProgress ⭐⭐⭐
    - Multi-stage visualization
    - Time estimates
    - Error states

11. TranslationJobCard ⭐⭐⭐
    - List view for jobs
    - Status badges
    - Language flags

12. CandidateComparison ⭐⭐⭐
    - Grid of 5 specialists
    - Click to expand
    - Rating system
    - Copy functionality

13. SpecialistCard ⭐⭐
    - Individual specialist display
    - Insights section
    - Processing stats

**Deliverables:**
- ✅ Core experience components working
- ✅ Integration with existing app
- ✅ Basic user testing

### Phase 4: Comparison & Metadata (Week 4)
**Goal: Build differentiation components**

14. CandidateDiff ⭐⭐
    - Side-by-side comparison
    - Highlight differences
    - Toggle candidates

15. MetadataExplorer ⭐⭐
    - Tab navigation
    - Character profiles
    - Cultural terms
    - Relationships

16. ExportDialog
    - Multiple formats
    - Options selection
    - Preview mode

**Deliverables:**
- ✅ Comparison features working
- ✅ Metadata display rich
- ✅ Export functional

### Phase 5+: Polish & Advanced (Ongoing)
**Goal: Nice-to-have and future features**

17. Remaining components based on user feedback
    - QualityMetrics
    - CostTracker
    - TranslationTimeline
    - CharacterProfileCard
    - BatchUpload

18. Advanced features 🚀
    - InteractiveDiff
    - PromptEditor
    - TranslationMemorySearch
    - CollaborationPanel
    - ABTestComparison

## Reusability Matrix

| Component | Reused By | Abstraction Priority |
|-----------|-----------|---------------------|
| Badge | 12 components | ⭐⭐⭐ Critical |
| Card | 10 components | ⭐⭐⭐ Critical |
| Progress | 6 components | ⭐⭐⭐ Critical |
| DiffEngine | 4 components | ⭐⭐⭐ Critical |
| CopyButton | 8 components | ⭐⭐⭐ Critical |
| SpecialistTheme | 8 components | ⭐⭐⭐ Critical |
| StatusIndicator | 6 components | ⭐⭐ High |
| ExpandableSection | 6 components | ⭐⭐ High |
| Rating | 3 components | ⭐⭐ High |
| TabPanel | 3 components | ⭐⭐ High |
| GridLayout | 4 components | ⭐⭐ High |
| BadgeGroup | 5 components | ⭐⭐ High |
| KeyValueList | 4 components | ⭐ Medium |
| MetricDisplay | 3 components | ⭐ Medium |

## Benefits of This Approach

### Development Speed
- **60% faster** - Build once, reuse everywhere
- **Consistent API** - Learn once, apply everywhere
- **Less debugging** - Tested shared components

### Consistency
- **Visual consistency** - Same look & feel
- **Behavioral consistency** - Same interactions
- **Theme consistency** - Specialist colors unified

### Maintainability
- **Single source of truth** - Update once, affects all
- **Easier refactoring** - Change abstraction, not 10 files
- **Better testing** - Test abstractions thoroughly

### Scalability
- **New features faster** - Compose from existing pieces
- **Variants easier** - Extend base components
- **Team collaboration** - Clear component boundaries

## Anti-Patterns to Avoid

❌ **Don't:**
- Build components in isolation without considering reuse
- Create one-off components for similar functionality
- Hard-code specialist colors/themes in individual components
- Duplicate diff logic across components
- Recreate card layouts for each feature
- Build separate copy-to-clipboard implementations

✅ **Do:**
- Start with the abstraction, then build specifics
- Use composition over duplication
- Extract common patterns early
- Build a design system
- Create examples/docs for abstractions
- Test abstractions thoroughly before building on them

## Success Metrics

After implementing abstractions:

1. **Code Reuse**: 60%+ of component code should use shared abstractions
2. **Build Time**: New FableForge components should take 50% less time
3. **Bug Rate**: Shared component bugs affect multiple features (fix once)
4. **Consistency Score**: Visual diff between components < 5%
5. **Developer Experience**: New team members productive faster

## Next Steps

1. **Review this document** with the team
2. **Validate assumptions** - Are these the right abstractions?
3. **Prototype key abstractions** - Build DiffEngine, ActionCard, StageProgress
4. **Get feedback** - Test with real data
5. **Iterate** - Refine based on usage
6. **Document** - Create usage examples
7. **Build** - Follow the roadmap

---

**Created:** 2025-11-17
**Status:** Proposal
**Next Review:** After Phase 1 completion
