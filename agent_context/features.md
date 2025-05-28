# Features
<!-- Last Updated: 2025-05-26 -->

## Feature: Context Management
- **Status**: ✅ Active
- **Confidence**: High
- **Last Verified**: 2025-05-26
- **Description**:
  Provides functionality to store and retrieve context files for different projects, allowing AI agents to maintain and access persistent context across sessions.

### Implementation
- **Components**: [Server, Validation, Storage]
- **Entry Points**: [server.ts:MCPServer, validation.ts:validateContent]
- **Dependencies**: [Express, AJV, TypeScript]

### Usage
```typescript
// Example: Getting context for a project
const context = await server.getContext('project-123', 'mental_model');

// Example: Updating context
await server.updateContext('project-123', 'mental_model', newContent);
```

### Related
- **Bugs**: [BUG-001]
- **Files**: [src/server.ts, src/validation.ts, src/types.ts]

### Notes
- [ ] Add persistent storage
- [ ] Implement authentication
- [ ] Add rate limiting

---

## Feature: Schema Validation
- **Status**: ✅ Active
- **Confidence**: High
- **Last Verified**: 2025-05-26
- **Description**:
  Validates context content against predefined JSON schemas to ensure data consistency and structure compliance.

### Implementation
- **Components**: [Validation, Schemas]
- **Entry Points**: [validation.ts:validateContent]
- **Dependencies**: [AJV, JSON Schema]

### Usage
```typescript
const result = validateContent(content, schema);
if (!result.isValid) {
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
