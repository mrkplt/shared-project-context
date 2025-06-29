# Development Workflow and Testing Guidelines for Context Type System

## Project Context Loading

### Initial Setup
Load Project Context: Start by accessing the CXMS project context to understand the codebase
Use betashared-project-context tools to:
- `list_projects()` to see available projects
- `list_contexts("cxms")` to see what context exists
- `get_context("mental_model")` for technical architecture
- `get_context("features")` for implementation status
- `get_context("session_summary")` for development history

### Understand the Context Type Architecture
The system is a production-ready TypeScript MCP server with a sophisticated context type system:
- **Context Type Factory**: Creates appropriate context type instances based on project configuration
- **Base Context Type**: Abstract base class with validation logic and template integration
- **6 Concrete Context Types**: Specialized behavior classes for different content patterns
- **Template Validation System**: Markdown structure validation using remark AST parsing
- **FileSystemHelper**: Core persistence layer that all context types delegate to

### Context Type System Components
**Core Types (6 implementations):**
- `templatedSingleDocument.ts` - Single file with template validation
- `freeformSingleDocument.ts` - Single file without validation
- `templatedDocumentCollection.ts` - Multiple files with template validation
- `freeformDocumentCollection.ts` - Multiple files without validation
- `templatedLog.ts` - Timestamped append-only with template validation
- `freeformLog.ts` - Timestamped append-only without validation

**Supporting Architecture:**
- `contextTypeFactory.ts` - Type-safe instantiation based on project config
- `baseContextType.ts` - Shared validation and configuration logic
- `MarkdownTemplateValidator.ts` - Template structure validation

### Locate Source Code
Primary code is in `/Users/mark/src/shared-project-context/`
- Context types: `src/models/context_types/`
- Factory: `src/models/contexTypeFactory.ts`
- Tests: `src/__tests__/` directory
- Configuration: `jest.config.js`, `package.json`, `tsconfig.json`

## Working with AI Assistant Tools

### Available Tools

**Zen (zen:chat, zen:testgen)**: General collaboration and brainstorming
- Code reviews and feedback on test approaches
- Architecture discussions and design patterns
- Best practices validation for context type testing
- Quick questions about type behaviors

**Sequential Thinking (sequential-thinking:sequentialthinking)**: Structured step-by-step analysis
- Breaking down complex context type interaction scenarios
- Planning multi-step validation workflows
- Working through type-specific behavior verification
- Systematic analysis of factory patterns

**Language Server (language-server:*)**: Code analysis and navigation
- Get definitions of context type methods and interfaces
- Find references across the context type system
- Get hover information for type configurations
- Analyze context type inheritance patterns

### When to Use Each Tool

**Use zen:chat, zen:testgen for:**
- Reviewing context type test strategies
- Discussing type-specific behavior patterns
- Brainstorming validation scenarios
- Getting feedback on factory testing approaches

**Use sequential-thinking for:**
- Complex context type interaction debugging
- Multi-step template validation workflows
- Breaking down factory instantiation issues
- Systematic analysis of type behavior differences

**Use language-server for:**
- Understanding context type interfaces and inheritance
- Finding all implementations of abstract methods
- Getting type information for factory patterns
- Analyzing configuration dependencies

### Tool Interaction Patterns

**Provide Full Context**: Always include:
- Which context type you're testing
- Configuration requirements (templated vs freeform)
- Expected vs actual behavior
- Code snippets showing setup and assertions

**Iterative Development:**
1. Start with basic type instantiation test
2. Get feedback on factory usage patterns
3. Add behavior-specific scenarios
4. Refine based on discovered edge cases

**Model Selection**:
- `o4-mini`: Good for context type behavior discussions
- `o3`: For complex factory pattern analysis
- Use higher thinking modes for multi-type interaction scenarios

## Context Type System Testing Strategy

### Core Testing Philosophy
**Integration-First Approach**: Test complete workflows through public APIs only
- Factory instantiation → context type creation → behavior verification
- Real filesystem operations with temporary directories
- End-to-end validation including template processing
- Document actual behavior vs ideal specifications

### Testing Architecture Levels

#### 1. Factory Pattern Testing
```typescript
describe('ContextTypeFactory', () => {
  test('creates correct type instances', async () => {
    const factory = await contextTypeFactory({
      persistenceHelper: new FileSystemHelper(tempDir),
      projectName: 'test-project',
      contextType: 'templated-single-document',
      content: 'test content'
    });
    
    expect(factory).toBeInstanceOf(TemplatedSingleDocument);
  });
});
```

#### 2. Base Context Type Validation
```typescript
describe('BaseContextType.validate', () => {
  test('validation with template configured', async () => {
    // Test through concrete implementation
    const context = await contextTypeFactory({...});
    const result = await context.validate();
    expect(result.isValid).toBe(true);
  });
});
```

#### 3. Type-Specific Behavior Testing
Each context type tested individually for its specialized behavior patterns.

### Parameterized Testing Strategy

#### Context Type Test Matrix
```typescript
const contextTypeScenarios = [
  {
    name: 'templated-single-document',
    baseType: 'templated-single-document',
    requiresTemplate: true,
    expectedFilePattern: /^context-name\.md$/,
    behaviorType: 'replace'
  },
  {
    name: 'freeform-document-collection',
    baseType: 'freeform-document-collection',
    requiresTemplate: false,
    expectedFilePattern: /^.+\.md$/,
    behaviorType: 'collection'
  },
  {
    name: 'templated-log',
    baseType: 'templated-log',
    requiresTemplate: true,
    expectedFilePattern: /^context-name-\d{4}-\d{2}-\d{2}T.+\.md$/,
    behaviorType: 'append'
  }
];

describe.each(contextTypeScenarios)('$name behavior', (scenario) => {
  // Shared test cases for all types
});
```

#### Shared Behavioral Scenarios
For every context type, test these core patterns:

**Update → Read Cycle**
```typescript
test('update then read returns same content', async () => {
  const content = 'Test content for ' + scenario.name;
  const context = await createTestContext(scenario);
  
  await context.update();
  const result = await context.read();
  
  expect(result.success).toBe(true);
  expect(result.content).toEqual(content);
});
```

**Reset Behavior**
```typescript
test('reset clears context appropriately', async () => {
  const context = await createTestContext(scenario);
  await context.update();
  
  const resetResult = await context.reset();
  expect(resetResult.success).toBe(true);
  
  // Verify filesystem state
  const files = await listContextFiles(tempDir, scenario.name);
  expect(files).toEqual([]); // or document actual behavior
});
```

**Idempotent Operations**
```typescript
test('multiple updates behave consistently', async () => {
  const context = await createTestContext(scenario);
  
  await context.update();
  await context.update(); // Second update
  
  const result = await context.read();
  // Document actual behavior: overwrite vs append vs collection
});
```

### Type-Specific Testing Patterns

#### Single Document Types
```typescript
describe('Single Document Behavior', () => {
  test('ignores context name for file resolution', async () => {
    // Single documents always use the context type name as filename
    // regardless of the contextName parameter
  });
  
  test('replace behavior on update', async () => {
    // Verify updates replace entire content, not append
  });
});
```

#### Document Collection Types
```typescript
describe('Document Collection Behavior', () => {
  test('creates separate files for each context name', async () => {
    // Multiple contextName values should create multiple .md files
  });
  
  test('reads all files when no specific context requested', async () => {
    // Verify collection reading behavior
  });
});
```

#### Log Types
```typescript
describe('Log Behavior', () => {
  test('creates timestamped files', async () => {
    // Verify timestamp pattern in filename
  });
  
  test('chronological reading order', async () => {
    // Verify reading multiple log entries in correct order
  });
});
```

#### Templated vs Freeform Differences
```typescript
describe('Template Validation', () => {
  describe('templated types', () => {
    test('validates against template structure', async () => {
      // Test template validation integration
    });
    
    test('rejects content not matching template', async () => {
      // Test validation failure scenarios
    });
  });
  
  describe('freeform types', () => {
    test('accepts any content without validation', async () => {
      // Test absence of validation
    });
  });
});
```

## Test Implementation Guidelines

### Standard Test Structure
```typescript
describe('ContextTypeName.methodName', () => {
  let tempDir: string;
  let persistenceHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-type-test-'));
    persistenceHelper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    
    // Initialize project with required configuration
    await persistenceHelper.initProject(projectName);
    await setupProjectConfig(projectName, contextTypeConfig);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('describes expected behavior', async () => {
    const context = await contextTypeFactory({
      persistenceHelper,
      projectName,
      contextType: 'target-type',
      contextName: 'test-context',
      content: 'test content'
    });

    const result = await context.update();
    expect(result.success).toBe(true);

    // Verify filesystem state
    const files = await listContextFiles(tempDir, projectName, 'target-type');
    expect(files).toHaveLength(1);
  });
});
```

### Test Utilities
```typescript
// Helper functions for common test operations
async function createTestContext(scenario, options = {}) {
  const config = {
    persistenceHelper: options.persistenceHelper,
    projectName: options.projectName || 'test-project',
    contextType: scenario.name,
    contextName: options.contextName || 'test-context',
    content: options.content || 'test content'
  };
  
  return await contextTypeFactory(config);
}

async function setupProjectConfig(projectName, contextTypes) {
  // Create project configuration with specified context types
}

async function listContextFiles(tempDir, projectName, contextType) {
  // List all files for a specific context type
}

async function verifyFileContent(filePath, expectedContent) {
  // Read and compare file content
}
```

### Core Development Constraints

#### CRITICAL: No Production Code Changes
- Never modify context type classes for testing convenience
- No dependency injection changes just for test mocking
- No visibility changes (private → protected) for testing
- No architectural modifications to accommodate tests

#### Testing Philosophy
- **Test Only Public APIs**: Focus on update(), read(), reset() methods
- **Test Real Behavior**: Use actual filesystem operations and factory instantiation
- **Document Current Behavior**: Tests should reflect actual system behavior
- **Integration-Focused**: Prefer end-to-end testing over isolated unit tests

### Acceptable Testing Approaches
- **Real Factory Usage**: Use contextTypeFactory for all instance creation
- **Real Filesystem Testing**: Use temporary directories with full cleanup
- **Public API Integration**: Test complete workflows through exposed methods
- **Behavioral Documentation**: Capture and verify current type behaviors
- **Template Integration**: Test actual template validation when applicable

### Unacceptable Testing Approaches
- **Private Method Access**: Using `as any` to access internal methods
- **Production Code Modification**: Any changes for test convenience
- **Over-Mocking**: Mocking FileSystemHelper or other internal dependencies
- **Implementation Coupling**: Tests that break when internals change

## Edge Cases and Error Scenarios

### Factory Error Handling
```typescript
test('factory throws for unknown context type', async () => {
  await expect(contextTypeFactory({
    persistenceHelper,
    projectName: 'test',
    contextType: 'unknown-type'
  })).rejects.toThrow('Unknown context type: unknown-type');
});

test('factory handles missing project configuration', async () => {
  await expect(contextTypeFactory({
    persistenceHelper,
    projectName: 'nonexistent-project',
    contextType: 'general'
  })).rejects.toThrow(/Failed to load project configuration/);
});
```

### Context Type Error Handling
```typescript
test('update without content returns appropriate error', async () => {
  const context = await contextTypeFactory({
    persistenceHelper,
    projectName,
    contextType: 'test-type',
    // No content provided
  });
  
  const result = await context.update();
  expect(result.success).toBe(false);
  expect(result.errors).toContain('Content is required');
});
```

### Template Validation Errors
```typescript
test('templated type validates content structure', async () => {
  const context = await contextTypeFactory({
    persistenceHelper,
    projectName,
    contextType: 'templated-single-document',
    content: 'Invalid template structure'
  });
  
  const validationResult = await context.validate();
  expect(validationResult.isValid).toBe(false);
  expect(validationResult.validationErrors).toBeDefined();
  expect(validationResult.correctionGuidance).toBeDefined();
});
```

### Filesystem Edge Cases
```typescript
test('handles missing project directory', async () => {
  // Test behavior when project directory doesn't exist
});

test('handles permission errors gracefully', async () => {
  // Test behavior with read-only directories
});

test('handles concurrent access correctly', async () => {
  // Test multiple context operations simultaneously
});
```

## File Organization

### Test File Location
- Place tests in `src/__tests__/` directory
- Use descriptive naming: `contextType.behaviorName.test.ts`
- Group related tests: `factory.test.ts`, `baseContextType.test.ts`
- Type-specific tests: `templatedSingleDocument.test.ts`

### Test File Patterns
```
src/__tests__/
├── contextTypeFactory.test.ts          # Factory instantiation tests
├── baseContextType.validation.test.ts  # Shared validation logic
├── contextTypes.shared.behavior.test.ts # Parameterized tests for all types
├── templatedSingleDocument.test.ts     # Type-specific behavior
├── freeformDocumentCollection.test.ts  # Type-specific behavior
├── templatedLog.test.ts                # Type-specific behavior
└── utilities/
    ├── testHelpers.ts                  # Shared test utilities
    └── testFixtures.ts                 # Test data and configurations
```

## Success Criteria

### A Good Context Type Test Should:
- **Test Factory Integration**: Use contextTypeFactory for instance creation
- **Verify Type Behavior**: Test the specific behavior patterns of each type
- **Use Real Operations**: Actual filesystem operations with temporary directories
- **Document Current Reality**: Clearly show what the system does today
- **Cover Error Scenarios**: Handle validation failures and edge cases
- **Be Maintainable**: Won't break when internal implementation changes

### Testing Completeness Checklist:
- [ ] Factory creates all 6 context types correctly
- [ ] All context types implement update(), read(), reset() correctly
- [ ] Template validation works for templated types
- [ ] Freeform types skip validation appropriately
- [ ] Single document types use correct file naming
- [ ] Collection types handle multiple files correctly
- [ ] Log types create timestamped files
- [ ] Error handling works for all failure scenarios

### Collaboration Success:
- Use AI tools appropriately for design and review
- All constraints respected throughout development
- Code quality maintained with project standards
- Tests provide value without being brittle
- Clear documentation of discovered behaviors

## Common Pitfalls to Avoid

### Context Type Testing Pitfalls
- **Type Confusion**: Don't test FileSystemHelper directly, test through context types
- **Factory Bypass**: Always use contextTypeFactory, never instantiate types directly
- **Template Mocking**: Use real template files, don't mock template validation
- **Behavior Assumptions**: Test and document actual behavior, don't assume ideal behavior

### General Testing Pitfalls
- **Overthinking Architecture**: Don't redesign the system for easier testing
- **Mocking Everything**: Real operations provide better confidence
- **Testing Internals**: Focus on public API behavior only
- **Ignoring Edge Cases**: Context types have many subtle behavior differences

## Example Workflow

1. **Load CXMS project context** to understand current architecture
2. **Identify context type to test** (e.g., TemplatedSingleDocument)
3. **Read implementation code** using filesystem or language-server tools
4. **Plan test scenarios** covering type-specific behavior patterns
5. **Discuss approach with zen**: "Here's my testing plan for templated single documents..."
6. **Implement factory-based test setup** with real filesystem operations
7. **Write behavior verification tests** using public APIs only
8. **Review with zen**: "Here's the implementation, does this cover the key behaviors?"
9. **Refine based on feedback** and discovered edge cases
10. **Add to test suite** following project conventions
11. **Update project context** if significant patterns discovered

Remember: The goal is to create reliable, maintainable tests that verify actual context type behavior through the factory pattern and public APIs, without compromising the production architecture's design and encapsulation. Focus on documenting real behavior patterns rather than testing internal implementation details.