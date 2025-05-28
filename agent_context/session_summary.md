# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with TypeScript and Express
- Basic MCP server implementation
- Validation module with schema validation
- Test infrastructure with Jest

### Fixed
- Fixed import path in validation.test.ts from '../validation' to './validation' (BUG-001)

## [0.1.0] - 2025-05-26

### Added
- Initial project structure
- Core MCP server implementation
- Validation utilities with AJV
- Test suite for validation and server components
- Documentation and templates for agent context

### Technical Stack
- **Language**: TypeScript
- **Runtime**: Node.js
- **Web Framework**: Express
- **Testing**: Jest
- **Validation**: AJV (JSON Schema)

### Project Structure
```
src/
  __tests__/         # Test files
    validation.test.ts  # Tests for content validation
    server.test.ts     # Tests for MCP server functionality
  server.ts           # Main server implementation
  validation.ts       # Content validation utilities
  types.ts            # TypeScript type definitions
  mock-mcp-server.ts  # Mock implementation for testing
```

### Development Commands
- `npm test` - Run tests
- `npm run test:coverage` - Generate test coverage report
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Compile TypeScript code
- `npm start` - Start the server
- `npm run dev` - Start in development mode

---

<!-- Previous sessions below this line -->
