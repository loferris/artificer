# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-15

### Added

#### Core Features
- **Source Maps** - Track blocks back to original document positions with line and column information
  - `includeSourceMap` option in `ImportOptions`
  - Source map includes version, mappings, sources, and source content
  - Implemented for Markdown importer

- **Error Recovery** - Graceful error handling with strict and non-strict modes
  - `strictMode` option (default: true) - throws on first error
  - `onError` callback for custom error handling in non-strict mode
  - Continue processing even when encountering malformed blocks

#### Enhanced Format Support

**Obsidian/Markdown**
- Wiki link support: `[[Page Name]]` and `[[Page Name|Alias]]`
- Proper parsing and conversion to `wikiLink` mark definitions
- Split wiki links into multiple spans with proper mark references

**Roam Research**
- Page references: `[[Page Name]]` and `[[Page|Alias]]`
- Block references: `((uid))`
- Attributes: `key:: value`
- TODO markers: `{{TODO}}` → ☐ and `{{[DONE]}}` → ☑
- Full formatting support: bold, italic, code, strikethrough, highlight
- Complete tokenizer for Roam-specific syntax

**Notion**
- Extended block type support:
  - Embed blocks
  - File and PDF blocks
  - Video blocks (external and file)
  - Audio blocks
  - Column layouts (`columnList` and `column`)
  - Child page blocks
  - Table of contents blocks
  - Link preview blocks
- Improved nested list handling with proper hierarchy

#### List Support
- Deep nesting support for all formats
- Proper level tracking for nested lists
- Mixed list types (bullet and numbered) in nested structures
- Recursive export of nested lists with children arrays

#### Plugin System Improvements
- `PluginRegistrationOptions` interface with `allowOverwrite` flag
- `registerImporterAsync()` and `registerExporterAsync()` for thread-safe registration
- `unregisterImporter()` and `unregisterExporter()` methods
- `hasImporter()` and `hasExporter()` helper methods
- Promise chaining for concurrent registration safety
- Thread-safety documentation

### Fixed

- **Mark Handling** - Fixed inconsistent mark handling in exports
  - Added `markDefs` field to `CalloutBlock` type
  - Fixed callout block conversion in Markdown and Notion exporters
  - Fixed bug in NotionExporter: `markDef?.type` → `markDef?._type`
  - Marks now properly preserved during round-trip conversions

- **Nested Lists** - Fixed shallow nesting limitations
  - Markdown importer already supported deep nesting
  - Fixed NotionImporter to handle nested lists recursively
  - Fixed NotionExporter to properly structure nested lists with children arrays

### Improved

- **UID Generation** - Enhanced security in RoamExporter
  - Now uses `crypto.getRandomValues()` when available
  - Falls back to `Math.random()` for compatibility
  - Improved randomness for block UID generation

- **Type Safety** - Added proper TypeScript types for all new features
  - `BlockReferenceMark` and `AttributeMark` interfaces
  - Enhanced `RoamBlock` and `RoamPage` interfaces
  - New block type interfaces for extended Notion support
  - `SourceMapEntry` and `SourceMap` interfaces

### Documentation

- Updated README with comprehensive feature documentation
- Added examples for source maps and error recovery
- Documented all new Roam, Notion, and Obsidian features
- Added API reference for new plugin registry methods
- Enhanced JSDoc comments throughout codebase
- Created CHANGELOG to track version history

### Tests

- 47 comprehensive test cases (all passing)
- Tests for mark preservation in callouts
- Tests for plugin registry (duplicate prevention, overwrite, async, unregister)
- Tests for deeply nested lists and mixed list types
- Tests for extended Notion block types
- Tests for source map functionality
- Tests for Roam features (page refs, block refs, attributes, TODOs, formatting)

### Internal

- Code cleanup: removed informal logging and dead code
- Implemented TODO for wiki link parsing in Markdown importer
- Improved error messages and validation

## [0.0.1] - Initial Release

### Added
- Basic Markdown, Notion, and Roam importers/exporters
- Portable Text intermediate format
- Pluggable format adapter architecture
- Plugin system for custom importers/exporters
- Document validation (size, depth, block count)
- Comprehensive test coverage
