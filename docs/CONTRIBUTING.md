# Contributing to AI Workflow Engine

Thank you for your interest in contributing! This project is built in public as part of exploring better AI workflows for knowledge work.

## Development Setup

### Prerequisites
- Node.js 18+ 
- Docker (for PostgreSQL)
- Git

### Getting Started

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd ai-workflow-engine
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Add your OPENROUTER_API_KEY and other configuration
   ```

3. **Database setup**
   ```bash
   npm run db:up      # Start PostgreSQL with Docker
   npm run db:migrate # Apply database migrations
   ```

4. **Start development**
   ```bash
   npm run dev        # Custom server with WebSocket support
   # OR
   npm run dev:next   # Standard Next.js (HTTP only)
   ```

## Architecture Overview

This is a headless API service with clean service layer architecture:

- **Service Layer**: Core business logic in `src/server/services/`
- **tRPC API**: Type-safe routing in `src/server/routers/`
- **Streaming**: WebSocket subscriptions + SSE endpoints
- **Database**: PostgreSQL with Prisma ORM

## Development Guidelines

### Code Quality
```bash
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Run test suite
npm run test:coverage # Coverage report
```

### Testing Strategy
- **Unit tests**: Service layer and utilities
- **Integration tests**: tRPC procedures and streaming
- **Component tests**: Critical UI elements
- **SSE tests**: CLI compatibility

Target: Maintain >50% coverage focusing on business-critical paths.

### Database Changes
```bash
npm run db:migrate   # Apply migrations
npm run db:studio    # GUI for development
npm run db:reset     # Reset (removes all data)
```

## Streaming Features

The system supports dual streaming approaches:

- **WebSocket**: Real-time subscriptions for frontend
- **SSE**: HTTP streaming for CLI tools and automation

See `SSE_STREAMING.md` for CLI usage examples.

## Contribution Process

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feat/your-feature-name`
3. **Make your changes**
   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed
4. **Run quality checks**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
5. **Submit a pull request**

## Areas for Contribution

### High Priority
- UI/UX improvements for conversation management
- Conversation branching UI implementation (backend ready)
- Enhanced export format implementations
- Performance optimizations

### Future Features
- Advanced model routing logic
- Context compression agents
- Cross-session context preservation

### Medium Priority
- Additional export formats
- Enhanced error handling
- Accessibility improvements
- Mobile responsiveness

### Documentation
- Usage examples
- Integration guides
- Architecture documentation

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with committed config
- **Linting**: ESLint with Next.js configuration
- **Testing**: Vitest with React Testing Library

## Questions?

- Check existing issues and discussions
- Review the codebase - it's designed to be readable
- Open an issue for bugs or feature requests

This project documents the process of building better AI workflows, so the development journey itself is part of the value being created.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
