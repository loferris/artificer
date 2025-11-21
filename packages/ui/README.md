# @artificer/ui

Core UI component library for Artificer - domain-agnostic React components with TypeScript generics.

## Features

- **ThemeRegistry**: Type-safe theme management system
- **GroupedList**: Generic grouped item display component
- **DiffViewer**: Generic diff viewer with side-by-side/unified modes
- **ExportDialog**: Generic export dialog with format configuration
- **ThemedBadge**: Theme-aware badge component
- **ThemedCard**: Theme-aware card component
- **Hooks**: `useExpandableCollection`, `useComponentLogger`

## Installation

```bash
# In monorepo workspace
pnpm add @artificer/ui

# From npm (when published)
npm install @artificer/ui
```

## Usage

```typescript
import { ThemeRegistry, GroupedList, DiffViewer } from '@artificer/ui'

// Create a theme registry
const myThemes = new ThemeRegistry<'foo' | 'bar'>()
myThemes.register('foo', {
  icon: '🎨',
  color: 'blue',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
  textColor: 'text-blue-700',
  label: 'Foo Theme'
})

// Use components
<GroupedList
  items={items}
  groupBy={(item) => item.category}
  renderItem={(item) => <div>{item.name}</div>}
  groupThemes={myThemes}
/>
```

## License

MIT
