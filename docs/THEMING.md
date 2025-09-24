# Theme System Documentation

The AI Workflow Engine features a comprehensive theme system built with CSS custom properties and React Context API, providing three distinct themes optimized for different preferences and lighting conditions.

## Available Themes

### 🌙 **Dark Mode** (`purple-rich`)
- **Description**: Dark theme with deep purples and emerald accents
- **Background**: Deep purple gradients (#0f0a1a to #1a0f2e)
- **Accent Colors**: Emerald green user input, cyan assistant responses
- **Best For**: Low-light environments, extended coding sessions

### 🌲 **Amber Mode** (`amber-forest`) 
- **Description**: Warm earth tones with forest-inspired colors
- **Background**: Rich brown/amber gradients (#2d2a1e to #3d3426)
- **Accent Colors**: Mint green user input, warm amber highlights
- **Best For**: Natural lighting, focus-intensive work

### ☀️ **Light Mode** (`cyan-rich`)
- **Description**: Clean light theme with cyan and periwinkle watercolor effects
- **Background**: Subtle watercolor gradients with cyan/periwinkle washes
- **Accent Colors**: Darker mint green for contrast, cyan highlights
- **Best For**: Bright environments, daytime use

## Theme Architecture

### CSS Custom Properties System
Each theme defines 90+ CSS custom properties providing complete design tokens:

```css
[data-terminal-theme='purple-rich'] {
  /* Foundation Colors */
  --terminal-bg-primary: #0f0a1a;
  --terminal-text-primary: #c9a8fa;
  --terminal-accent-user: #6ee7b7;    /* Mint green user input */
  
  /* AI Workflow Semantics */
  --terminal-model-claude: #ff6b35;
  --terminal-model-deepseek: #3b82f6;
  --terminal-cost-low: #34d399;
  
  /* Interactive States */
  --terminal-hover-bg: #374151;
  --terminal-focus-outline: #34d399;
  /* ... 80+ more properties */
}
```

### React Context API
Theme state management via `TerminalThemeContext`:

```typescript
const { theme, setTheme, getThemeDisplayName } = useTerminalTheme();
const themeClasses = useTerminalThemeClasses();

// Theme switching
setTheme('amber-forest');  // purple-rich | amber-forest | cyan-light

// CSS class generation
<div className={themeClasses.bgPrimary}>  // Generates theme-aware classes
```

## Theme Usage

### Switching Themes

**Terminal Interface (Slash Commands):**
```bash
/theme dark    # Switch to purple-rich (dark mode)
/theme amber   # Switch to amber-forest  
/theme light   # Switch to cyan-light
/theme         # Show current theme
```

**Programmatic Theme Switching:**
```typescript
import { useTerminalTheme } from '@/contexts/TerminalThemeContext';

const { setTheme } = useTerminalTheme();
setTheme('cyan-light');
```

### Using Theme Classes in Components

```typescript
import { useTerminalThemeClasses } from '@/contexts/TerminalThemeContext';

const MyComponent = () => {
  const themeClasses = useTerminalThemeClasses();
  
  return (
    <div className={`
      ${themeClasses.bgPrimary} 
      ${themeClasses.textPrimary}
      ${themeClasses.borderPrimary}
    `}>
      <span className={themeClasses.accentUser}>User message</span>
      <span className={themeClasses.accentAssistant}>AI response</span>
    </div>
  );
};
```

## Theme Persistence

- **Storage**: Themes persist in `localStorage` under the key `'terminal-theme'`
- **Document Attribute**: Current theme applied as `data-terminal-theme` attribute on `<html>`
- **Initialization**: Themes load from localStorage on app startup, falling back to default

## Component Integration

### Theme-Responsive Components

**CostTracker**: Different styling for terminal vs chat modes
```typescript
const containerClass = isTerminal 
  ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary}` // Terminal theme
  : `bg-white/80 text-gray-700 border-pink-200`;              // Chat mode override
```

**ChatInput**: Uses theme-aware user input color
```typescript
className={themeClasses.accentUser}  // Mint green in all themes
```

### View Mode Separation

**Terminal View**: Full theme system integration
- All components use theme classes
- Watercolor effects for enhanced visual appeal
- Complete theme responsiveness

**Chat View**: Independent styling
- Pink/purple gradient aesthetic regardless of terminal theme
- Hardcoded styles with inline CSS for theme immunity
- Cost tracker and buttons adapt to chat aesthetic

## File Structure

```
src/
├── styles/themes/
│   ├── purple-rich.css      # Dark mode theme
│   ├── amber-forest.css     # Amber mode theme  
│   ├── cyan-light.css       # Light mode theme
│   ├── terminal.css         # Base terminal styles
│   └── blank-template.css   # Template for new themes
├── contexts/
│   └── TerminalThemeContext.tsx  # Theme context and hooks
└── styles/
    └── index.css            # Theme imports and global styles
```

## Creating New Themes

1. **Copy the blank template**: `src/styles/themes/blank-template.css`
2. **Replace theme name**: Change all instances of `'blank-template'` to your theme name
3. **Define CSS variables**: Set all 90+ custom properties for your color scheme
4. **Add to context**: Update `TerminalThemeContext.tsx` to include the new theme
5. **Import styles**: Add CSS import to `src/styles/index.css`

## Design Tokens

Each theme provides consistent design tokens for:

- **Foundation Colors**: Backgrounds, text, borders (12 properties)
- **AI Workflow Semantics**: Model colors, routing info, cost indicators (15 properties)  
- **Interactive States**: Hover, focus, disabled states (8 properties)
- **Typography**: Font families, sizes, line heights (12 properties)
- **Layout**: Spacing, padding, border radius (15 properties)
- **Effects**: Shadows, transitions, opacity (10 properties)
- **Accessibility**: High contrast, focus indicators (8 properties)
- **Watercolor Effects**: Layered backgrounds for visual depth (5 properties)

## Testing

Theme system includes comprehensive unit tests:

- **Theme Context**: Tests theme switching, persistence, CSS class generation
- **Component Integration**: Tests theme-responsive components (CostTracker, ChatInput)
- **View Separation**: Tests that chat view remains independent of terminal themes

```bash
npm test TerminalThemeContext CostTracker
```

## Browser Support

- **CSS Custom Properties**: All modern browsers (IE11+ with PostCSS polyfill)
- **CSS Grid/Flexbox**: Full support for layout system
- **Backdrop Filter**: Modern browsers for glassmorphism effects
- **Graceful Degradation**: Fallback classes for unsupported features

## Performance Considerations

- **CSS Custom Properties**: No runtime calculation overhead
- **Single CSS Bundle**: All themes loaded once, switched via CSS selectors
- **Minimal JavaScript**: Theme switching only updates document attribute
- **Efficient Re-renders**: React Context optimized to minimize component updates
