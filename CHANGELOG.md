# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Real-time streaming infrastructure**: WebSocket subscriptions for frontend + SSE endpoints for CLI tools
- **Custom Next.js server**: WebSocket support while maintaining standard Next.js compatibility
- **tRPC subscriptions**: Type-safe real-time streaming with `trpc.subscriptions.chatStream.useSubscription()`
- **SSE streaming endpoints**: HTTP-based streaming at `/api/stream/chat` for CLI and third-party integrations
- **Unified streaming architecture**: Both WebSocket and SSE use the same ChatService async generators
- **Comprehensive test suite**: 388 tests with 51% coverage, including streaming endpoint tests
- **Split link routing**: Automatic routing of subscriptions to WebSocket, queries/mutations to HTTP
- **Rate limiting**: Applied to both HTTP and streaming endpoints
- **CORS support**: Full cross-origin support for SSE endpoints
- **Error handling**: Graceful error streaming and connection management
- **CLI documentation**: Complete usage examples for cURL, Node.js, Python, and Bash

### Changed
- **Development commands**: `npm run dev` now starts custom server with WebSocket support
- **Service layer**: Enhanced ChatService with streaming capabilities via async generators
- **Client architecture**: tRPC client now supports both HTTP and WebSocket connections
- **Session management**: Consistent session handling across HTTP and WebSocket connections

### Technical Details
- Custom server configuration with WebSocket support at `/api/trpc-ws`
- SSE endpoints with proper event-stream formatting and JSON validation
- Comprehensive error scenarios covered in test suite
- Documentation restructured for public vs internal use

## [Previous Versions]

See commit history for detailed changes in earlier versions.