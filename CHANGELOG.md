# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2025-09-18] - Codebase Documentation and Review

### Added

- **JSDoc Comments**: Added extensive JSDoc comments to key components, hooks, and API routers to improve code clarity and self-documentation. This includes:
  - `useChat` hook
  - `TerminalView` component
  - `chatRouterRefactored` tRPC router

### Changed

- **Codebase Review**: Performed a general codebase review focusing on documentation consistency, naming conventions, test design, and comments.
- **Changelog**: Updated the changelog to reflect the latest release.

## [2025-09-15] - Test Suite Stabilization & Type Safety

### Fixed

- **Test Suite Stability**: Fixed failing export router test due to data type inconsistencies
- **Type Safety Improvements**: Resolved TypeScript compilation errors in error handling for TRPC clients
- **Test Data Consistency**: Standardized `parentId` field handling between `null` and `undefined` in test mocks
- **React Hook Dependencies**: Fixed ESLint warning for missing dependencies in `ConversationOrchestrator` useCallback
- **Error Boundary Type Safety**: Fixed React ErrorInfo componentStack optional type handling
- **Data Model Consistency**: Standardized `parentId` type from `string | null` to `string?` across the codebase

### Changed

- **Type Definitions**: Updated Message interface to use consistent optional `parentId` field type
- **Hook Architecture**: Restructured useCallback dependencies to avoid circular dependencies
- **Error Handling**: Improved error type casting for TRPC client errors with proper unknown type conversion
- **Documentation**: Updated README.md and CHANGELOG.md to reflect accurate current state vs aspirational features

### Technical Details

- All 390+ tests now pass consistently
- TypeScript compilation with strict mode enabled
- ESLint warnings resolved across codebase
- Improved architectural consistency in data models

## [Previous Release] - Core Feature Development

### Added

- **Dual UI Interface System**: Terminal interface with slash commands + Classic chat interface for different workflow preferences
- **Comprehensive Theme System**: Three responsive themes (Purple-Rich, Amber-Forest, Cyan-Light) with CSS custom properties
- **Advanced Slash Commands**: `/theme`, `/view`, `/streaming`, `/export`, `/new`, `/list`, `/man` commands for terminal interface
- **Integrated Cost Tracking**: Real-time usage and cost monitoring widget with theme-responsive styling
- **Theme Persistence**: Automatic theme saving to localStorage with SSR-safe error handling
- **Watercolor Visual Effects**: Subtle gradient backgrounds and glassmorphism effects across all themes
- **View Mode Separation**: Distinct input handlers and message logic for terminal vs chat interfaces
- **Theme-Responsive Components**: All UI components adapt to selected theme with consistent design tokens
- **Real-time streaming infrastructure**: WebSocket subscriptions for frontend + SSE endpoints for CLI tools
- **Custom Next.js server**: WebSocket support while maintaining standard Next.js compatibility
- **tRPC subscriptions**: Type-safe real-time streaming with `trpc.subscriptions.chatStream.useSubscription()`
- **SSE streaming endpoints**: HTTP-based streaming at `/api/stream/chat` for CLI and third-party integrations
- **Unified streaming architecture**: Both WebSocket and SSE use the same ChatService async generators
- **Comprehensive test suite**: 390+ tests across 42 test files with full coverage of critical components
- **Split link routing**: Automatic routing of subscriptions to WebSocket, queries/mutations to HTTP
- **Rate limiting**: Applied to both HTTP and streaming endpoints
- **CORS support**: Full cross-origin support for SSE endpoints
- **Error handling**: Graceful error streaming and connection management
- **CLI documentation**: Complete usage examples for cURL, Node.js, Python, and Bash

### Fixed

- **Type Safety Improvements**: Fixed TypeScript errors in error handling for TRPC clients
- **Test Data Consistency**: Resolved `parentId` field inconsistencies between `null` and `undefined` in test mocks
- **React Hook Dependencies**: Fixed ESLint warning for missing dependencies in `ConversationOrchestrator` useCallback
- **Error Boundary Type Safety**: Fixed React ErrorInfo componentStack optional type handling
- **Data Model Consistency**: Standardized `parentId` type from `string | null` to `string?` across the codebase

### Changed

- **Type Definitions**: Updated Message interface to use consistent optional `parentId` field type
- **Hook Architecture**: Restructured useCallback dependencies to avoid circular dependencies
- **Error Handling**: Improved error type casting for TRPC client errors with proper unknown type conversion
- **User Interface**: Default interface now starts in terminal mode with theme-aware styling
- **Message Display**: User input messages now display in mint green (#6ee7b7) across all themes
- **Chat Interface**: Chat view now uses pink/purple gradient aesthetic independent of terminal themes
- **Input Handling**: Separate input processors for terminal (with slash commands) vs chat (standard messaging) modes
- **Cost Tracker**: Now theme-responsive with different styling for terminal vs chat modes
- **Development commands**: `npm run dev` now starts custom server with WebSocket support
- **Service layer**: Enhanced ChatService with streaming capabilities via async generators
- **Client architecture**: tRPC client now supports both HTTP and WebSocket connections
- **Session management**: Consistent session handling across HTTP and WebSocket connections

### Technical Details

- **Theme Architecture**: CSS custom properties system with 90+ design tokens per theme
- **React Context API**: Centralized theme management with `TerminalThemeProvider` and `useTerminalTheme` hooks
- **CSS Class Generation**: Dynamic theme-aware CSS class utilities via `useTerminalThemeClasses`
- **File Structure**: Organized theme files in `src/styles/themes/` with template for custom themes
- **Component Architecture**: Theme-responsive components with conditional styling logic
- **LocalStorage Integration**: Safe theme persistence with SSR compatibility and error handling
- Custom server configuration with WebSocket support at `/api/trpc-ws`
- SSE endpoints with proper event-stream formatting and JSON validation
- Comprehensive error scenarios covered in test suite
- Documentation restructured for public vs internal use

### Documentation

- **New Theme Documentation**: Comprehensive theming guide at `docs/THEMING.md`
- **Updated README**: Added UI features section with slash commands reference
- **Developer Docs**: Updated architecture documentation in `docs/internal/CLAUDE.md`
- **Unit Tests**: Added theme system tests for `TerminalThemeContext` and `CostTracker` components

## [Previous Versions]

See commit history for detailed changes in earlier versions.
