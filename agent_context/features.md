# Features
<!-- Last Updated: 2025-05-28 -->

## Feature: MCP Server Implementation
- **Status**: ✅ Active
- **Confidence**: High
- **Last Verified**: 2025-05-28
- **Description**:
  Implements the Model Context Protocol (MCP) server for agent communication, providing a standardized way to manage and access project context.

### Implementation
- **Components**: [MCPServer, Transport, Tool Handlers]
- **Entry Points**: [src/mcp/ContextMCPServer.ts]
- **Dependencies**: [@modelcontextprotocol/sdk, TypeScript]

### Usage
```typescript
// Initialize MCP Server
const mcpServer = new ContextMCPServer();

// Start listening for agent connections
mcpServer.start();
```

### Related
- **Bugs**: [BUG-002]
- **Files**: [src/mcp/ContextMCPServer.ts, src/project/ProjectManager.ts]

### Notes
- [x] Implement basic MCP server
- [x] Add stdio transport
- [ ] Add WebSocket transport
- [ ] Implement authentication

---

## Feature: Project Management
- **Status**: ✅ Active
- **Confidence**: High
- **Last Verified**: 2025-05-28
- **Description**:
  Manages project configurations, context files, and templates, providing isolation between different projects.

### Implementation
- **Components**: [ProjectManager, FileSystem, Templates]
- **Entry Points**: [src/project/ProjectManager.ts]
- **Dependencies**: [fs-extra, path]

### Usage
```typescript
const projectManager = new ProjectManager();
const projectId = await projectManager.initProject('/path/to/project');
const contextPath = projectManager.getContextFilePath(projectId, 'mental_model');
```

### Related
- **Bugs**: []
- **Files**: [src/project/ProjectManager.ts, src/types/project.ts]

---

## Feature: Template System
- **Status**: ✅ Active
- **Confidence**: Medium
- **Last Verified**: 2025-05-28
- **Description**:
  Defines and validates context file structures using JSON schemas and templates, ensuring consistency across projects.

### Implementation
- **Components**: [Templates, Schema Validator, Formatters]
- **Entry Points**: [src/validation/validator.ts]
- **Dependencies**: [AJV, json-schema-to-typescript]

### Usage
```typescript
const template = {
  name: 'mental_model',
  schema: {
    required_sections: ['overview', 'key_concepts', 'relationships'],
    section_schemas: {
      overview: {
        required: true,
        format: 'markdown',
        min_length: 100
      }
    }
  }
};

const result = validateAgainstTemplate(content, template);
```

### Related
- **Bugs**: []
- **Files**: [src/validation/templates/*.json, src/validation/validator.ts]

---

## Feature: Sequential Reasoning Engine
- **Status**: 🚧 In Development
- **Confidence**: Medium
- **Last Verified**: 2025-05-28
- **Description**:
  Processes context updates through a series of validation and reasoning steps, providing structured feedback and suggestions.

### Implementation
- **Components**: [ReasoningEngine, ValidationPipeline, CorrectionGenerator]
- **Entry Points**: [src/reasoning/SequentialReasoningEngine.ts]
- **Dependencies**: [openai, langchain]

### Usage
```typescript
const reasoningEngine = new SequentialReasoningEngine();
const result = await reasoningEngine.processUpdate(
  projectId,
  'mental_model',
  newContent
);
```

### Related
- **Bugs**: []
- **Files**: [src/reasoning/SequentialReasoningEngine.ts]
  console.error('Validation errors:', result.errors);
}
```

### Related
- **Files**: [src/validation.ts, src/types.ts]

### Notes
- [ ] Add more schema validations
- [ ] Custom error messages for validation failures

---

## Feature: MCP Protocol Implementation
- **Status**: 🚧 In Development
- **Confidence**: Medium
- **Last Verified**: 2025-05-26
- **Description**:
  Implements the Model Context Protocol for standardized tool integration and interoperability.

### Implementation
- **Components**: [Server, Protocol]
- **Entry Points**: [server.ts:MCPServer]
- **Dependencies**: [Express, TypeScript]

### Related
- **Files**: [src/server.ts, src/types.ts]

### Notes
- [ ] Complete protocol implementation
- [ ] Add protocol documentation
- [ ] Implement protocol versioning
