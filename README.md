# MCP Context Server

A Model Context Protocol (MCP) server implementation for managing AI agent context files. This server provides tools for getting and updating context files with validation and correction guidance.

## Features

- **Context Management**: Store and retrieve context files for different projects
- **Validation**: Validate context content against schemas
- **Correction Guidance**: Get suggestions for fixing invalid content
- **MCP Protocol**: Implements the Model Context Protocol for tool integration

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Starting the Server

```bash
npm start
```

### Available Tools

The server provides the following tools:

#### get_context

Get a context file for a project.

**Parameters:**
- `projectName` (string): The ID of the project
- `contextType` (string): Type of context file ('mental_model', 'session_summary', 'bugs', 'features')

**Example:**
```typescript
const result = await executeTool('get_context', {
  projectName: 'my-project',
  contextType: 'mental_model'
});
```

#### update_context

Update a context file with validation.

**Parameters:**
- `projectName` (string): The ID of the project
- `contextType` (string): Type of context file ('mental_model', 'session_summary', 'bugs', 'features')
- `content` (string): The content to update

**Example:**
```typescript
const result = await executeTool('update_context', {
  projectName: 'my-project',
  contextType: 'mental_model',
  content: '# Project Mental Model\n\n## Overview\n\nProject details here.'
});
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Development

### Project Structure

- `src/` - Source code
  - `server.ts` - Main server implementation
  - `validation.ts` - Content validation logic
  - `types.ts` - TypeScript type definitions
  - `mock-mcp-server.ts` - Mock MCP server for testing
- `__tests__/` - Test files

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## License

MIT
