# Development Workflow and Testing Guidelines for shared-project-context

## Project Context Loading

### Initial Setup
Load Project Context: Start by accessing the CXMS project context to understand the codebase
Use betashared-project-context tools to:
- list_projects() to see available projects
- list_contexts("cxms") to see what context exists
- get_context("mental_model") for technical architecture
- get_context("features") for implementation status
- get_context("session_summary") for development history

### Understand the Architecture
The system is a production-ready TypeScript MCP server with:
- FileSystemHelper: Core persistence layer with filesystem operations
- Context Type System: Specialized behavior classes for different content types
- Template Validation: Markdown structure validation using remark AST parsing
- Archive System: Data preservation during reset operations

### Locate Source Code
Primary code is in /Users/mark/src/shared-project-context/
- Main implementation: src/models/context_types/utilities/fileSystem.ts
- Tests: src/__tests__/ directory
- Configuration: jest.config.js, package.json, tsconfig.json

## Working with AI Assistant Tools

### Available Tools

**Zen (zen:chat)**: General collaboration and brainstorming
- Code reviews and feedback on test approaches
- Architecture discussions and design patterns
- Best practices validation
- Quick questions and explanations

**Sequential Thinking (sequential-thinking:sequentialthinking)**: Structured step-by-step analysis
- Breaking down complex problems into steps
- Planning multi-step solutions
- Working through logical sequences
- When you need to think through a problem systematically

**Language Server (language-server:*)**: Code analysis and navigation
- Get definitions of functions and types
- Find references and usages across codebase
- Get hover information and documentation
- Rename symbols safely
- Get diagnostics for files

### When to Use Each Tool

**Use zen:chat for:**
- Getting second opinions on approaches
- Discussing design decisions
- Brainstorming solutions
- General development questions

**Use sequential-thinking for:**
- Complex debugging workflows
- Multi-step test planning
- Breaking down large problems
- Systematic analysis of issues

**Use language-server for:**
- Understanding code structure
- Finding where methods are used
- Getting type information
- Code navigation and analysis

### Tool Interaction Patterns

**Provide Full Context**: Always give complete information including:
- Code snippets you're working with
- Constraints you're operating under
- What you've already tried
- Specific questions or concerns

**Iterative Collaboration:**
1. Start with your initial approach
2. Get feedback and suggestions
3. Implement improvements
4. Continue until satisfied

**Model Selection**: Choose appropriate models:
- o4-mini: Good for most development discussions
- o3: For complex reasoning and systematic analysis
- Use higher thinking modes for complex problems

### Example Workflows

**Zen workflow:**
1. "I need to test method X. Here's my approach: [code]"
2. Get review and suggestions
3. "Here are the improvements I made: [updated code]"
4. Continue refining until satisfied

**Sequential thinking workflow:**
1. "I need to debug this complex issue step by step"
2. Work through systematic investigation
3. Build understanding incrementally
4. Reach conclusion through structured analysis

**Language server workflow:**
1. Use definition() to understand method implementation
2. Use references() to see how it's used
3. Use hover() to get type information
4. Use diagnostics() to check for issues

## Code Reading and Writing Guidelines

### Reading Code
Use filesystem tools to explore the codebase:
- filesystem:read_file() for individual files
- filesystem:list_directory() for structure exploration
- filesystem:search_files() to find specific patterns
- filesystem:directory_tree() for overview (careful with large dirs)

Understand Dependencies: Look at imports and how classes interact
Check Existing Tests: Review src/__tests__/ to understand testing patterns

### Writing Code
Follow Existing Patterns: Match the codebase style and structure
Use Proper Tools:
- filesystem:write_file() for new files
- filesystem:edit_file() for modifications
- artifacts for complex code that needs refinement

TypeScript Best Practices:
- Use proper typing
- Follow existing naming conventions
- Maintain consistent code structure

## Core Development Constraints

### CRITICAL: No Production Code Changes
- Never modify the main application classes for testing convenience
- No dependency injection just for test mocking
- No visibility changes (private → protected) just for testing
- No architectural modifications to accommodate tests

### Testing Philosophy
- Test Only Public APIs: Focus on methods users actually call
- Test Real Behavior: Use actual filesystem operations, not mocks
- Document Current Behavior: Tests should reflect what the system does, not what you think it should do
- Integration-Focused: Prefer real end-to-end testing over unit test mocking

### What This Means
```typescript
// ❌ DON'T: Mock private methods
jest.spyOn(helper as any, 'privateMethod')

// ❌ DON'T: Change production code for testing
class FileSystemHelper {
  protected methodForTesting() { } // NO
}

// ✅ DO: Test through public APIs
const result = await helper.publicMethod()
expect(result.success).toBe(true)

// ✅ DO: Verify actual filesystem state
const stats = await fs.stat(expectedPath)
expect(stats.isDirectory()).toBe(true)
```

## Acceptable Testing Approaches
- Real Filesystem Testing: Use temporary directories
- Public API Integration: Test complete workflows
- Behavioral Documentation: Capture and verify current system behavior
- Edge Case Exploration: Test various inputs through public methods

## Unacceptable Testing Approaches
- Private Method Mocking: Using as any to access internals
- Production Code Modification: Any changes just for test convenience
- Over-Engineering: Complex dependency injection for simple testing needs
- Implementation Coupling: Tests that break when internals change

## Testing Workflow

### 1. Planning Phase
- Identify the public method to test
- Understand what it does by reading the code
- Determine what real behavior to verify
- Plan test cases covering happy path, errors, and edge cases

### 2. Implementation Phase
```typescript
// Standard test structure
describe('ClassName.methodName', () => {
  let tempDir: string;
  let instance: ClassName;
  
  beforeEach(async () => {
    // Set up clean test environment
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
    instance = new ClassName(tempDir);
  });
  
  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  test('describes expected behavior', async () => {
    // Call public method
    const result = await instance.publicMethod(input);
    
    // Verify response
    expect(result.success).toBe(true);
    
    // Verify actual filesystem/side effects
    const stats = await fs.stat(expectedPath);
    expect(stats.isDirectory()).toBe(true);
  });
});
```

### 3. Review Phase
- Use available AI tools for code review
- Ensure all constraints are followed
- Verify comprehensive coverage through public API only
- Confirm tests document actual behavior

### 4. Integration Phase
- Add test to existing test directory structure
- Ensure compatibility with existing Jest configuration
- Run tests to verify they work in the project environment
- Update project context if significant

## File Organization

### Test File Location
- Place tests in src/__tests__/ directory
- Use descriptive naming: className.methodName.test.ts
- Follow existing Jest configuration patterns

### Working with Existing Setup
- The project has mocked filesystem in setup.ts
- Use jest.unmock('fs') if you need real filesystem operations
- Respect existing test patterns and configurations

## Success Criteria

### A Good Test Should:
- Test public behavior only - no internal method access
- Use real operations - actual filesystem, network, etc. when appropriate
- Be maintainable - won't break when internals change
- Document behavior - clearly shows what the system does
- Provide good coverage - handles happy path, errors, edge cases
- Be reliable - consistent results across environments

### Collaboration Success:
- Use AI tools appropriately for the task at hand
- All constraints are respected throughout the process
- Code quality is high and follows project standards
- Tests provide value without being brittle or over-engineered

## Common Pitfalls to Avoid
- Overthinking: Don't jump to dependency injection or architectural changes
- Mocking Everything: Real operations are often better than mocks
- Testing Internals: Focus on user-observable behavior
- Ignoring Constraints: Always respect the "no production changes" rule
- Working in Isolation: Use AI tools for review and validation

## Example Workflow
1. Load CXMS project context
2. Identify method to test (e.g., FileSystemHelper.initProject)
3. Read the implementation code using filesystem or language-server tools
4. Draft initial test approach
5. Discuss with zen: "Here's my testing plan..."
6. Implement feedback
7. Write the test code
8. Review with zen: "Here's the implementation..."
9. Refine based on feedback
10. Add to repository
11. Update project context if needed

Remember: The goal is to create reliable, maintainable tests that verify real behavior without compromising the production codebase's design and encapsulation.