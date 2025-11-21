# @artificer/translator

Translator domain extension for Artificer UI - Specialist translation pipeline components.

## Features

- **Specialist Themes**: 6 specialist types (Cultural, Prose, Dialogue, Narrative, Fluency, Final Synthesis)
- **SpecialistBadge**: Auto-themed badge component for specialists
- **Specialist Utilities**: Pipeline ordering, formatting, display helpers

## Installation

```bash
# In monorepo workspace
pnpm add @artificer/translator

# From npm (when published)
npm install @artificer/translator @artificer/ui
```

## Usage

```typescript
import { specialistThemes, SpecialistBadge } from '@artificer/translator'

// Use theme registry
const theme = specialistThemes.get('cultural_specialist')
console.log(theme.icon) // 🌏
console.log(theme.label) // Cultural Specialist

// Use component
<SpecialistBadge specialist="prose_stylist" />
```

## License

MIT
