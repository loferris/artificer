# @artificer/hellbat

Hellbat domain extension for Artificer UI - Worldbuilding operations and validation components.

## Features

- **Operation Themes**: 9 operation intents (CREATE_ENTITY, UPDATE_ENTITY, etc.)
- **Validation Themes**: 3 severity levels (error, warning, info)
- **OperationBadge**: Auto-themed badge for operation intents
- **ValidationBadge**: Auto-themed badge for validation severity
- **Operation Utilities**: Grouping, filtering, parsing operations
- **Validation Utilities**: Grouping, filtering, auto-fix support

## Installation

```bash
# In monorepo workspace
pnpm add @artificer/hellbat

# From npm (when published)
npm install @artificer/hellbat @artificer/ui
```

## Usage

```typescript
import {
  operationThemes,
  validationThemes,
  OperationBadge,
  ValidationBadge
} from '@artificer/hellbat'

// Use theme registries
const opTheme = operationThemes.get('CREATE_ENTITY')
const valTheme = validationThemes.get('error')

// Use components
<OperationBadge intent="CREATE_ENTITY" />
<ValidationBadge severity="error" count={5} />
```

## License

MIT
