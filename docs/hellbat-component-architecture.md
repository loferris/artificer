# Hellbat Component Library Architecture

**Date:** 2025-01-17
**Status:** Implementation Ready
**Reusability from FableForge:** ~50% code reuse

---

## Overview

The Hellbat component library provides a comprehensive set of React components for building worldbuilding AI applications that integrate with Artificer. The library follows composition-first, TypeScript-first architecture with headless + styled variants.

### Key Features
- **Conversation Management:** Real-time chat with streaming support
- **Validation Display:** Error/warning/info panels with suggestions
- **Operation Timeline:** Visual display of worldbuilding operations
- **Entity Relationships:** Graph visualization of world entities
- **RAG Source Attribution:** Document reference display
- **Model Selection:** Multi-model routing interface
- **Export/Import:** Multiple format support (markdown, JSON, Obsidian, WorldAnvil)

---

## Architecture Principles

### 1. Composition Over Configuration
```tsx
// Good: Composable
<ConversationView>
  <ConversationHeader />
  <MessageList>
    {messages.map(msg => (
      <Message key={msg.id}>
        <MessageContent content={msg.content} />
        <SourceAttribution sources={msg.sources} />
        <ValidationPanel results={msg.validation} />
      </Message>
    ))}
  </MessageList>
  <MessageInput />
</ConversationView>
```

### 2. Headless UI + Styled Variants
```tsx
// Headless for full control
import { useConversation } from '@/components/hellbat/hooks'

// Pre-styled for quick setup
import { ConversationView } from '@/components/hellbat/chat'
```

### 3. TypeScript-First
- Full type safety throughout
- Exported types for all props and data structures
- Strict null checking
- Generic types where applicable

---

## Component Tiers

### Tier 1: Atomic Components (Reused from FableForge)
- **Badge** ✅ - Status, severity, entity types
- **Card** ✅ - Messages, operations, entities
- **Button** ✅ - Actions
- **Progress** ✅ - Streaming indicator
- **Dialog** ✅ - Modals (export, promotion)

### Tier 2: Molecular Components
**Reused from FableForge:**
- **StatusBadge** ✅ - Extended for validation severity
- **BadgeGroup** ✅ - Tags, entity types
- **ExpandableSection** ✅ - Operation details
- **CopyButton** ✅ - Copy operations/text

**New for Hellbat:**
- **StreamingIndicator** - Typing animation cursor
- **SeverityIcon** - Error/Warning/Info icons
- **SourceChip** - Inline source badges
- **OperationIcon** - Icons for CREATE/UPDATE/DELETE/etc.

### Tier 3: Organism Components

#### Chat Components
1. **ConversationView** - Full chat interface
2. **MessageList** - Scrollable message container
3. **Message** - Individual message display
4. **StreamingMessage** - Real-time streaming text
5. **MessageInput** - User input with controls
6. **SourceAttribution** - RAG source display

#### Navigation Components
7. **ProjectSelector** - Project switcher
8. **ConversationSelector** - Conversation list

#### Validation Components
9. **ValidationPanel** - Error/warning display
10. **ValidationItem** - Individual validation result
11. **SuggestionCard** - Fix suggestions

#### Operations Components
12. **OperationsList** - Timeline of operations
13. **OperationItem** - Individual operation card
14. **OperationDiff** - Before/after changes

#### Visualization Components
15. **EntityGraph** - React Flow graph
16. **EntityNode** - Graph node component
17. **RelationshipEdge** - Graph edge component

#### Utility Components
18. **ModelSelector** - Model selection UI
19. **PromotionWizard** - Multi-step promotion
20. **ExportDialog** - Format export (adapted from FableForge)
21. **SearchPanel** - Search with filters
22. **DiffViewer** - Operation diffs (adapted from FableForge)

---

## Shared Libraries

### Utilities (New)
- **streaming-utils.ts** - SSE/WebSocket helpers
- **validation-utils.ts** - Group/filter validations
- **operation-utils.ts** - Parse and format operations
- **graph-utils.ts** - Graph layout algorithms

### Utilities (Reused from FableForge)
- **time-utils.ts** ✅ - formatTimeAgo for messages
- **diff-engine.ts** ✅ - For DiffViewer
- **cn.ts** ✅ - Class merging
- **componentLogger.ts** ✅ - Logging

### Custom Hooks
- **useConversation** - Conversation state management
- **useStreamingMessage** - Handle SSE/WebSocket streaming
- **useValidation** - Validation state and utilities
- **useProject** - Project state management
- **useModelRouter** - Model selection logic
- **useOperations** - Operations parsing and grouping

---

## Data Types

### Core Types
```typescript
// Conversation
interface Conversation {
  id: string
  projectId: string
  status: 'loose' | 'world'
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Message
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Source[]
  operations?: Operation[]
  validation?: ValidationResult[]
  streaming?: boolean
  timestamp: Date
}

// Operation
interface Operation {
  id: string
  intent: OperationIntent
  entityType?: string
  entityName?: string
  attributes?: Record<string, unknown>
  validation?: ValidationResult[]
  timestamp: Date
}

type OperationIntent =
  | 'CREATE_ENTITY'
  | 'UPDATE_ENTITY'
  | 'DELETE_ENTITY'
  | 'DEFINE_RELATIONSHIP'
  | 'UPDATE_RELATIONSHIP'
  | 'DELETE_RELATIONSHIP'
  | 'ADD_ATTRIBUTE'
  | 'REMOVE_ATTRIBUTE'

// Validation
interface ValidationResult {
  id: string
  severity: 'error' | 'warning' | 'info'
  validator: string
  message: string
  suggestion?: string
  autoFix?: () => void
  entityId?: string
}

// Entity (for graph)
interface Entity {
  id: string
  name: string
  type: string
  attributes: Record<string, unknown>
  relationships: Relationship[]
}

// Relationship
interface Relationship {
  id: string
  from: string
  to: string
  type: string
  attributes?: Record<string, unknown>
}

// Source (RAG)
interface Source {
  id: string
  title: string
  content: string
  url?: string
  score?: number
  matchedText?: string
}

// Model
interface Model {
  id: string
  name: string
  provider: string
  capabilities: ModelCapability[]
  cost: {
    input: number
    output: number
  }
  recommended?: boolean
}

type ModelCapability = 'chat' | 'vision' | 'function_calling' | 'streaming'
```

---

## Component Reusability Matrix

| Component | FableForge Reuse | New Code | Time Saved |
|-----------|------------------|----------|------------|
| **ConversationView** | Card, ExpandableSection | Chat logic, streaming | 30% |
| **StreamingMessage** | - | Full implementation | 0% |
| **SourceAttribution** | Badge, BadgeGroup | Source display | 40% |
| **ProjectSelector** | Card, Badge | Selector logic | 35% |
| **ConversationSelector** | Card, StatusBadge | Grouping, filtering | 40% |
| **ValidationPanel** | Card, Badge, ExpandableSection | Severity grouping | 40% |
| **OperationsList** | Timeline structure, Card, Badge | Operation formatting | 50% |
| **ModelSelector** | Card, Badge, Progress | Model metadata | 40% |
| **EntityGraph** | - | React Flow integration | 0% |
| **DiffViewer** | CandidateDiff, diff-engine | Operation rendering | 70% |
| **PromotionWizard** | Dialog, Card, Button | Wizard logic | 40% |
| **ExportDialog** | ExportDialog component | Format options | 90% |
| **SearchPanel** | Card, BadgeGroup | Search logic | 35% |

**Overall Reuse: ~40-50% of code from FableForge patterns**

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Core utilities and hooks

- [ ] Create directory structure
- [ ] Build `streaming-utils.ts`
- [ ] Build `validation-utils.ts`
- [ ] Build `operation-utils.ts`
- [ ] Implement `useConversation` hook
- [ ] Implement `useStreamingMessage` hook
- [ ] Implement `useValidation` hook
- [ ] Write tests for utilities and hooks

**Deliverable:** Foundation for all components

### Phase 2: Core Chat (Week 1-2)
**Goal:** Working conversation interface

- [ ] ConversationView component
- [ ] MessageList component
- [ ] Message component
- [ ] StreamingMessage component
- [ ] MessageInput component
- [ ] SourceAttribution component
- [ ] Write tests for chat components

**Deliverable:** Functional chat interface with streaming

### Phase 3: Navigation & Validation (Week 2)
**Goal:** Project navigation and validation display

- [ ] ProjectSelector component
- [ ] ConversationSelector component
- [ ] ValidationPanel component
- [ ] ValidationItem component
- [ ] SuggestionCard component
- [ ] Write tests

**Deliverable:** Complete navigation and validation UI

### Phase 4: Operations & Models (Week 2-3)
**Goal:** Operation timeline and model selection

- [ ] OperationsList component
- [ ] OperationItem component
- [ ] ModelSelector component
- [ ] Write tests

**Deliverable:** Operation display and model routing UI

### Phase 5: Advanced Features (Week 3-4)
**Goal:** Visualization and utilities

- [ ] EntityGraph component (React Flow)
- [ ] DiffViewer component (adapt from FableForge)
- [ ] PromotionWizard component
- [ ] ExportDialog component (copy from FableForge)
- [ ] SearchPanel component
- [ ] Write tests

**Deliverable:** Full feature set

### Phase 6: Polish & Documentation (Week 4)
**Goal:** Production-ready library

- [ ] Demo page with all components
- [ ] Comprehensive documentation
- [ ] Usage examples
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Final testing

**Deliverable:** Production-ready component library

---

## Development Time Estimates

| Phase | Components | Estimated Time | With Reuse |
|-------|-----------|----------------|------------|
| Phase 1 | Utilities + Hooks | 10h | 10h |
| Phase 2 | Chat Components | 12h | 6h |
| Phase 3 | Navigation + Validation | 8h | 4h |
| Phase 4 | Operations + Models | 8h | 4h |
| Phase 5 | Advanced Features | 14.5h | 8h |
| Phase 6 | Demo + Docs | 6h | 4h |
| **Total** | **All Components** | **58.5h** | **36h** |

**Time Saved with FableForge Reuse: 22.5 hours (38%)**

---

## Theme System

Hellbat will use a custom theme system adapted from FableForge:

```typescript
// Operation intent theming
const operationTheme: Record<OperationIntent, OperationTheme> = {
  CREATE_ENTITY: {
    icon: '✨',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    label: 'Create Entity'
  },
  UPDATE_ENTITY: {
    icon: '📝',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Update Entity'
  },
  // ... more intents
}

// Validation severity theming
const severityTheme: Record<Severity, SeverityTheme> = {
  error: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700'
  },
  warning: {
    icon: '⚠️',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700'
  },
  info: {
    icon: 'ℹ️',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  }
}
```

---

## Testing Strategy

Similar to FableForge:
- **Unit tests** for utilities and hooks (Vitest)
- **Component tests** for all UI components (@testing-library/react)
- **Integration tests** for complex workflows
- **Target:** 90%+ coverage

---

## Next Steps

1. **Create directory structure**
2. **Implement Phase 1** (utilities and hooks)
3. **Build Phase 2** (chat components)
4. **Continue phases 3-6** systematically
5. **Launch with comprehensive demo**

---

## Success Metrics

- ✅ 20+ reusable components
- ✅ 90%+ test coverage
- ✅ Full TypeScript support
- ✅ Composition-first API
- ✅ Headless + styled variants
- ✅ Comprehensive documentation
- ✅ 35-40% development time savings vs building from scratch
