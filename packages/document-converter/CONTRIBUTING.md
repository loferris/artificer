# Contributing to Document Converter

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository (or navigate to the package directory in the monorepo)
cd lib/document-converter

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode for development
npm run test:watch
```

## Project Structure

```
src/
├── adapters/          # Format adapter implementations
├── core/             # Core utilities and base classes
├── exporters/        # Export plugins (Portable Text → target format)
├── importers/        # Import plugins (source format → Portable Text)
├── plugins/          # Plugin registry and management
├── types/            # TypeScript type definitions
└── index.ts          # Main entry point
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clear, concise commit messages
- Follow existing code style (TypeScript strict mode)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build to ensure no TypeScript errors
npm run build

# Test the package locally
npm pack
```

### 4. Update Documentation

- Update README.md if adding new features
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)
- Add JSDoc comments to new public APIs
- Update examples if behavior changes

## Testing

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:ci
```

### Writing Tests

- Place test files in `src/__tests__/`
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Test edge cases and error conditions

Example:
```typescript
it('should handle empty documents', async () => {
  const converter = new DocumentConverter();
  const doc = await converter.import('');
  expect(doc.content).toEqual([]);
});
```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript mode
- Prefer interfaces over types for object shapes
- Use descriptive variable names
- Export types that users might need
- Avoid `any` - use `unknown` if type is truly unknown

### Code Organization

- Keep files focused and single-purpose
- Export public APIs from index.ts
- Use barrel exports for related modules
- Separate concerns (importers, exporters, adapters)

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what" in inline comments
- Keep comments up-to-date with code changes

## Adding New Format Support

### Adding an Importer

1. Create `src/importers/your-format-importer.ts`
2. Implement the `ImporterPlugin` interface
3. Add tests in `src/__tests__/`
4. Export from `src/index.ts`
5. Update README.md
6. Add example usage

Example:
```typescript
import type { ImporterPlugin, ConvertedDocument } from '../types/index.js';

export class YourFormatImporter implements ImporterPlugin {
  name = 'your-format';
  supportedFormats = ['ext'];

  detect(input: string | Buffer): boolean {
    // Detection logic
  }

  async import(input: string, options?: ImportOptions): Promise<ConvertedDocument> {
    // Conversion logic
  }
}
```

### Adding an Exporter

Similar process to importers, implement `ExporterPlugin` interface.

## Pull Request Process

1. **Update Tests**: Ensure all tests pass
2. **Update Documentation**: README, CHANGELOG, JSDoc
3. **Build Succeeds**: `npm run build` completes without errors
4. **Describe Changes**: Clear PR description with examples
5. **Link Issues**: Reference related issues with `Fixes #123`

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Code follows project style

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Commit: `git commit -am "Release v0.x.0"`
4. Tag: `git tag v0.x.0`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
