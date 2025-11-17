# Publishing Guide

This document outlines the steps to publish `@ai-workflow/document-converter` to npm.

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated with changes
- [ ] Repository URLs are correct in package.json
- [ ] LICENSE file exists
- [ ] README.md is up to date

## First-Time Setup

### 1. Update Repository URLs

If this is being extracted to a standalone repository, update `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR-USERNAME/document-converter.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR-USERNAME/document-converter/issues"
  },
  "homepage": "https://github.com/YOUR-USERNAME/document-converter#readme"
}
```

### 2. NPM Account Setup

```bash
# Login to npm (one-time setup)
npm login

# Verify you're logged in
npm whoami
```

### 3. Scope Setup (Optional)

If keeping the `@ai-workflow` scope:
- Ensure the scope exists in your npm account
- Or remove the scope: change name to `document-converter`

## Publishing Process

### 1. Version Bump

Choose the appropriate version bump:

```bash
# Patch release (0.1.0 → 0.1.1) - bug fixes
npm version patch

# Minor release (0.1.0 → 0.2.0) - new features
npm version minor

# Major release (0.1.0 → 1.0.0) - breaking changes
npm version major
```

This automatically:
- Updates package.json version
- Creates a git commit
- Creates a git tag

### 2. Update CHANGELOG

Edit `CHANGELOG.md` to document changes:

```markdown
## [0.2.0] - 2025-01-XX

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix Z
```

Commit the changes:

```bash
git add CHANGELOG.md
git commit --amend --no-edit
```

### 3. Test the Package

```bash
# Dry run to see what would be published
npm publish --dry-run

# Create a test tarball
npm pack

# Inspect the tarball
tar -tzf *.tgz

# Clean up
rm *.tgz
```

### 4. Publish

```bash
# For scoped packages, first publish may need --access public
npm publish --access public

# For subsequent publishes
npm publish
```

### 5. Verify Publication

```bash
# Check on npm
npm view @ai-workflow/document-converter

# Test installation in a new project
mkdir test-install && cd test-install
npm init -y
npm install @ai-workflow/document-converter
```

### 6. Push to Git

```bash
# Push commits and tags
git push origin main
git push origin --tags
```

### 7. Create GitHub Release

1. Go to GitHub releases page
2. Click "Create a new release"
3. Select the version tag (e.g., `v0.2.0`)
4. Title: "Release v0.2.0"
5. Copy content from CHANGELOG.md
6. Publish release

## Automated Publishing (Optional)

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Setup:
1. Create npm access token: https://www.npmjs.com/settings/YOUR-USERNAME/tokens
2. Add to GitHub secrets as `NPM_TOKEN`
3. Create a GitHub release to trigger publish

## Version Strategy

Following [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
  - API changes that break backward compatibility
  - Removed features
  - Changed behavior that affects users

- **MINOR** (0.x.0): New features
  - New importers/exporters
  - New format adapter features
  - New public APIs (backward compatible)

- **PATCH** (0.0.x): Bug fixes
  - Bug fixes
  - Performance improvements
  - Documentation updates
  - Internal refactoring

## Pre-Release Versions

For testing:

```bash
# Create beta version
npm version prerelease --preid=beta
# Results in: 0.1.0-beta.0

# Publish with beta tag
npm publish --tag beta

# Users install with:
npm install @ai-workflow/document-converter@beta
```

## Unpublishing (Emergency Only)

**Warning**: Only unpublish if absolutely necessary (security, legal issues)

```bash
# Unpublish a specific version (within 72 hours of publish)
npm unpublish @ai-workflow/document-converter@0.1.0

# Deprecate instead (preferred)
npm deprecate @ai-workflow/document-converter@0.1.0 "Critical bug, use 0.1.1 instead"
```

## Troubleshooting

### "Package already exists"
- Package name/scope is taken
- Change package name or request access to scope

### "Version already published"
- Can't republish same version
- Bump version and try again

### "Prepublish script failed"
- Tests or build failed
- Fix issues before publishing

### "Unauthorized"
- Not logged in: `npm login`
- Insufficient permissions for scoped package

## Support

For questions or issues with publishing:
- Check npm docs: https://docs.npmjs.com/
- npm support: https://www.npmjs.com/support
- GitHub Discussions (for this package)

## Security

- Never commit npm tokens to git
- Use GitHub secrets for automation
- Enable 2FA on npm account
- Rotate tokens periodically
