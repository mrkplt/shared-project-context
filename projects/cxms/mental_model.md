# Project Mental Model

## Architecture Overview

The Context Management System is built around the Model Context Protocol (MCP) with a modular, TypeScript-based architecture. The system is designed to be extensible, type-safe, and maintainable.

### Core Components:
1. **MCP Server**: Handles communication with AI agents via stdio transport
2. **Project Manager**: Manages project configurations and file system operations
3. **Validation Engine**: Enforces content structure and quality through schemas
4. **Template System**: Defines required sections and validation rules
5. **Sequential Reasoning Engine**: Processes updates with validation and correction

### Data Flow:
1. Agent requests context or updates via MCP
2. Request is routed through the MCP server
3. Project Manager handles file operations
4. Validation Engine ensures content quality
5. Response is sent back to the agent

## Key Features

- **TypeScript-based Implementation**: Ensures type safety and better developer experience
- **JSON Schema Validation**: Validates context content against defined schemas
- **Template System**: Supports different context types with custom validation rules
- **Project Isolation**: Each project maintains its own context and configuration
- **Extensible Architecture**: Easy to add new context types and validation rules

## Technical Details

### File Structure
```
~/.cxms/
  projects/
    {project-id}/
      mental_model.md
      session_summary.md
      bugs.md
      features.md
  templates/
    mental_model.json
    session_summary.json
    bugs.json
    features.json
```

### Core Interfaces
```typescript
interface ProjectConfig {
  id: string;
  name: string;
  path: string;        // actual project directory
  contextPath: string; // ~/.cxms/projects/{id}/
  templates: TemplateSet;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  confidence: number;
}

interface SectionSchema {
  name: string;
  required: boolean;
  format: 'markdown_list' | 'markdown_table' | 'freeform' | 'structured';
  min_length?: number;
  pattern?: string;
}
```

### Error Handling
- Uses structured error types for different validation failures
- Provides detailed error messages with correction guidance
- Maintains error severity levels (error/warning)

### Performance Considerations
- In-memory caching of project configurations
- Lazy loading of templates and schemas
- Batch processing for bulk operations

### Security
- File system operations are sandboxed to project directories
- Input validation for all external inputs
- No direct file system access from MCP handlers

### Extension Points
- Custom template definitions
- Plugin system for additional validation rules
- Support for custom storage backends

## Current Implementation State

### Server Configuration
- MCP server name: 'shared-project-context'
- Transport: stdio
- Version: 1.0.0

### Project Management
- Project-based context storage
- Isolated contexts with proper validation
- Template-based content structure

### Validation System
- JSON schema-based validation
- Structured error handling
- Type-safe implementation

### Next Steps
- Enhance validation rules
- Add more comprehensive error handling
- Improve documentation
- Consider additional transport methods