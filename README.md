# MCP Context Server

A production-ready Model Context Protocol (MCP) server implementation for persistent AI assistant context management. This server provides sophisticated tools for storing, retrieving, and validating context across AI collaboration sessions with project-specific customization and template validation.

## Features

- **Production-Ready Architecture**: Mature, tested system with comprehensive error handling and validation
- **Project-Based Organization**: Each project maintains isolated contexts, templates, and configuration
- **Sophisticated Context Types**: Six specialized context types supporting different content patterns and behaviors
- **Template Validation**: Advanced markdown structure validation with project-specific customization
- **Archive System**: Automatic data preservation during destructive operations
- **ES Module Compatibility**: Full modern JavaScript module support for latest dependencies
- **Comprehensive Testing**: Extensive test suite with real filesystem validation

## Quick Start

### Installation

```bash
# Clone and install
git clone <repository-url>
cd shared-project-context
npm install
npm run build

# Install globally for CLI usage
npm run install-server
```

### Usage

Start the server:
```bash
# Direct execution
npm start

# Or if installed globally
shared-project-context
```

The server provides 7 MCP tools for context management. See [Available Tools](#available-tools) for complete reference.

## Available Tools

### Core Operations

#### `list_projects`
Discover all available projects.
```typescript
await executeTool('list_projects', {});
// Returns: { success: true, data: ["project1", "project2"] }
```

#### `create_project`
Create a new project with default configuration.
```typescript
await executeTool('create_project', {
  project_name: 'my-project'
});
```

#### `list_contexts`
Discover available context types and existing content for a project.
```typescript
await executeTool('list_contexts', {
  project_name: 'my-project'
});
```

### Content Operations

#### `get_context`
Retrieve context content.
```typescript
// Single-document context types
await executeTool('get_context', {
  project_name: 'my-project',
  context_type: 'mental_model'
});

// Document collection types (requires context_name)
await executeTool('get_context', {
  project_name: 'my-project',
  context_type: 'features',
  context_name: 'user-authentication'
});
```

#### `update_context`
Create or update context with automatic validation.
```typescript
// Single-document update (replaces entire content)
await executeTool('update_context', {
  project_name: 'my-project',
  context_type: 'mental_model',
  content: '# Mental Model\n\n## Overview\n...'
});

// Log context (appends timestamped entry)
await executeTool('update_context', {
  project_name: 'my-project',
  context_type: 'session_summary',
  content: '## Session: 2025-06-28\n\n### Accomplished\n...'
});

// Document collection (requires context_name)
await executeTool('update_context', {
  project_name: 'my-project',
  context_type: 'features',
  context_name: 'user-authentication',
  content: '# Feature: User Authentication\n...'
});
```

#### `clear_context`
Clear context with automatic archiving for data safety.
```typescript
await executeTool('clear_context', {
  project_name: 'my-project',
  context_type: 'session_summary'
});
```

#### `get_project_templates`
Retrieve templates for validated context types.
```typescript
await executeTool('get_project_templates', {
  project_name: 'my-project'
});
```

## Configuration

### Project Configuration Overview

Projects use `project-config.json` files to define available context types. The system provides sensible defaults but supports extensive customization.

**Important**: Configuration files must be manually placed in the project directory at `~/.shared-project-context/projects/PROJECT_NAME/project-config.json`. This is intentional - configuration is a deliberate action requiring user control.

### Default Configuration

New projects start with minimal configuration for immediate usability:

```json
{
  "contextTypes": [
    {
      "baseType": "freeform-document-collection",
      "name": "general",
      "description": "Arbitrary named files for reference documents",
      "validation": false
    }
  ]
}
```

### Full Configuration Example

For advanced usage with validation and specialized types:

```json
{
  "contextTypes": [
    {
      "baseType": "templated-log",
      "name": "session_summary",
      "description": "Chronological development log with timestamps",
      "template": "session_summary",
      "validation": true
    },
    {
      "baseType": "templated-single-document",
      "name": "mental_model",
      "description": "Technical architecture understanding",
      "template": "mental_model",
      "validation": true
    },
    {
      "baseType": "templated-document-collection",
      "name": "features",
      "description": "Individual feature tracking with validation",
      "template": "features",
      "validation": true
    },
    {
      "baseType": "freeform-document-collection",
      "name": "other",
      "description": "Unstructured documents and references",
      "validation": false
    },
    {
      "baseType": "freeform-log",
      "name": "dev_log",
      "description": "Development activity log without validation",
      "validation": false
    },
    {
      "baseType": "freeform-single-document",
      "name": "start_here",
      "description": "Project onboarding document",
      "validation": false
    }
  ]
}
```

### Context Type Properties

- **baseType**: One of six specialized base types (see [Base Types](#base-types))
- **name**: Unique identifier for this context type within the project
- **description**: Human-readable description shown in `list_contexts`
- **template**: Template filename (without .md extension) for validation
- **validation**: Whether to validate content against template structure

## Base Types

The system provides six specialized base types, each optimized for different content patterns:

### Single Document Types

#### `templated-single-document`
- **Behavior**: Single file per context type, replaces content on update
- **Validation**: Required template with structure validation
- **Archiving**: Previous version archived automatically
- **Use Cases**: Architecture documents, mental models, specifications

#### `freeform-single-document`
- **Behavior**: Single file, no structure requirements
- **Validation**: None
- **Use Cases**: Project README, onboarding docs, unstructured notes

### Document Collection Types

#### `templated-document-collection`
- **Behavior**: Multiple named files, each validated against template
- **Validation**: Each document validated independently
- **Naming**: Requires `context_name` for all operations
- **Use Cases**: Feature tracking, API documentation, test plans

#### `freeform-document-collection`
- **Behavior**: Multiple named files, no validation
- **Naming**: Requires `context_name` for all operations
- **Use Cases**: Reference documents, notes, arbitrary files

### Log Types

#### `templated-log`
- **Behavior**: Append-only with timestamps, each entry validated
- **Validation**: Each new entry validated against template
- **Files**: Creates timestamped files for each update
- **Use Cases**: Session summaries, changelogs, meeting notes

#### `freeform-log`
- **Behavior**: Append-only with timestamps, no validation
- **Files**: Creates timestamped files for each update
- **Use Cases**: Debug logs, informal notes, activity tracking

## Templates

Templates define expected markdown structure for validated context types. They support flexible pattern matching and variable substitution.

### Template Management

Templates are automatically copied from the repository to projects on first use, enabling customization while maintaining defaults.

**Template Directory Structure:**
```
~/.shared-project-context/projects/my-project/
├── templates/
│   ├── mental_model.md      # Copied from repository defaults
│   ├── session_summary.md   # Can be customized per project
│   └── features.md          # Project-specific modifications
```

### Template Example

```markdown
# Mental Model
<!-- Last Updated: {{DATE}} -->

## System Overview
<!-- Confidence: High/Medium/Low -->
[Brief system description]

## Components
<!-- Format: Component Name (Confidence: High/Medium/Low) -->
- **ComponentName** (Confidence: High)
  - Purpose: [description]
  - Location: [file path]
  - Dependencies: [list]

## Data Flow
1. [Source] → [Process] → [Output]

## Key Decisions
1. **Decision**: [description]
   - Context: [background]
   - Options: [alternatives considered]
   - Chosen: [selected approach]
   - Impact: [consequences]
```

### Template Variables

Templates support variable substitution for dynamic content:

- `{{DATE}}`: Current timestamp
- `{{YYYY-MM-DD}}`: Current date
- `{{FEATURE_NAME}}`: Custom variables for specific contexts

**Variable Usage:**
```markdown
## Feature: {{FEATURE_NAME}}
<!-- Updated: {{DATE}} -->

## Session: {{SESSION_DATE}}
<!-- Session variables are validated for presence, not content -->
```

Variables provide structure guidance while allowing flexible content. The system validates that variable placeholders exist but doesn't constrain their replacement values.

## Workflow Guidance

The system includes comprehensive workflow prompts in the `prompts/` directory:

- **`session_summary.md`**: Guidance for logging development sessions
- **`testing.md`**: Comprehensive testing workflow with validation scenarios

These prompts provide structured approaches for common AI assistant collaboration patterns.

## Project Structure

```
~/.shared-project-context/
└── projects/
    └── my-project/
        ├── project-config.json           # Context type definitions
        ├── templates/                    # Project-specific templates
        │   ├── mental_model.md
        │   ├── session_summary.md
        │   └── features.md
        ├── mental_model/                 # Single-document contexts
        │   └── mental_model.md
        ├── session_summary/              # Log contexts (timestamped)
        │   ├── session_summary-2025-06-28T09-00-00-000Z.md
        │   └── session_summary-2025-06-28T14-30-00-000Z.md
        ├── features/                     # Document collections
        │   ├── user-authentication.md
        │   ├── data-validation.md
        │   └── api-design.md
        ├── other/                        # Freeform collections
        │   ├── architecture-notes.md
        │   ├── meeting-notes.md
        │   └── references.md
        └── archive/                      # Preserved previous versions
            ├── mental_model/
            │   └── 2025-06-28T13-45-00-000Z/
            └── session_summary/
                └── 2025-06-27T18-22-00-000Z/
```

## Advanced Usage

### Creating Custom Context Types

**Step 1: Choose Base Type**
Select the base type that matches your content pattern:
- Need validation? Choose `templated-*` types
- Need append behavior? Choose `*-log` types  
- Need multiple documents? Choose `*-collection` types

**Step 2: Create Template (if validated)**
For validated types, create a template in the project's `templates/` directory:

```bash
mkdir -p ~/.shared-project-context/projects/my-project/templates
cat > ~/.shared-project-context/projects/my-project/templates/my-template.md << 'EOF'
# {{CONTEXT_NAME}}
<!-- Generated: {{DATE}} -->

## Purpose
[Describe the purpose]

## Implementation
[Implementation details]

## Status
- [ ] Planned
- [ ] In Progress  
- [ ] Complete
EOF
```

**Step 3: Update Configuration**
Edit `project-config.json` to add your context type:

```json
{
  "contextTypes": [
    {
      "baseType": "templated-document-collection",
      "name": "custom_tracking",
      "description": "Custom implementation tracking",
      "template": "my-template",
      "validation": true
    }
  ]
}
```

**Step 4: Use Your Context Type**
```typescript
await executeTool('update_context', {
  project_name: "my-project",
  context_type: "custom_tracking",
  context_name: "payment-system",
  content: "# Payment System\n<!-- Generated: 2025-06-28 -->\n\n## Purpose\nSecure payment processing..."
});
```

### Environment Configuration

The system supports environment variables for customization:

```bash
# Override default context storage path
export SHARED_PROJECT_CONTEXT_PATH=/custom/path/to/contexts

# Start server with custom path
shared-project-context
```

## Development

### Running Tests

The system includes comprehensive testing infrastructure:

```bash
npm test              # Run full test suite
npm run test:watch    # Development watch mode
npm run test:coverage # Coverage reporting
```

### Code Architecture

- **`src/server.ts`**: MCP server implementation with tool definitions
- **`src/handlers/`**: Specialized request handlers for each MCP tool
- **`src/models/context_types/`**: Context type implementations and factory
- **`src/models/context_types/utilities/`**: FileSystem helper and validation
- **`src/types.ts`**: TypeScript interfaces and type definitions

### Adding New Base Types

1. Create class extending `BaseContextType`
2. Implement `ContextType` interface methods
3. Add to `baseTypeMap` in `contexTypeFactory.ts`
4. Update configuration interfaces if needed
5. Add comprehensive tests

## Example Configurations

### Software Development Project

```json
{
  "contextTypes": [
    {
      "baseType": "templated-log",
      "name": "session_summary",
      "description": "Development session chronological log",
      "template": "session_summary",
      "validation": true
    },
    {
      "baseType": "templated-single-document", 
      "name": "mental_model",
      "description": "System architecture understanding",
      "template": "mental_model",
      "validation": true
    },
    {
      "baseType": "templated-document-collection",
      "name": "features",
      "description": "Feature implementation tracking",
      "template": "features",
      "validation": true
    },
    {
      "baseType": "freeform-document-collection",
      "name": "docs",
      "description": "Project documentation and references",
      "validation": false
    }
  ]
}
```

### Research Project

```json
{
  "contextTypes": [
    {
      "baseType": "freeform-log",
      "name": "research_log",
      "description": "Daily research activities and observations",
      "validation": false
    },
    {
      "baseType": "freeform-document-collection",
      "name": "papers",
      "description": "Paper summaries and analysis",
      "validation": false
    },
    {
      "baseType": "templated-single-document",
      "name": "hypotheses",
      "description": "Current research hypotheses and theories",
      "template": "hypotheses",
      "validation": true
    },
    {
      "baseType": "templated-document-collection",
      "name": "experiments",
      "description": "Experiment design and results",
      "template": "experiment",
      "validation": true
    }
  ]
}
```

### Content Creation Project

```json
{
  "contextTypes": [
    {
      "baseType": "templated-document-collection",
      "name": "articles",
      "description": "Article drafts with structured format",
      "template": "article",
      "validation": true
    },
    {
      "baseType": "freeform-log",
      "name": "ideas",
      "description": "Content ideas and inspiration",
      "validation": false
    },
    {
      "baseType": "freeform-document-collection",
      "name": "resources",
      "description": "Research materials and references",
      "validation": false
    }
  ]
}
```

## Troubleshooting

### Context Type Not Found
**Symptom**: Error when trying to use a context type
**Solution**: Ensure the context type is defined in `project-config.json` at the correct path: `~/.shared-project-context/projects/PROJECT_NAME/project-config.json`

### Validation Errors
**Symptom**: Content rejected due to template validation
**Solution**: 
1. Use `get_project_templates` to see expected format
2. Check template structure matches your content
3. Ensure required sections and headers are present
4. Verify template variables are properly formatted

### Missing Templates
**Symptom**: Template not found errors for validated context types
**Solution**: Templates are automatically copied from repository defaults on first use. If missing:
1. Ensure context type has `"validation": true` and `"template": "template_name"`
2. Check that template exists in repository `templates/` directory
3. Template will be copied to project on next validation attempt

### Global Installation Issues
**Symptom**: `shared-project-context` command not found
**Solution**:
```bash
# Reinstall globally
npm run install-server

# Or run directly
node dist/server.js
```

### ES Module Import Errors
**Symptom**: ERR_REQUIRE_ESM or import resolution failures
**Solution**: The system is fully ES module compatible. Ensure you're using Node.js version that supports ES modules and imports include `.js` extensions for local files.

### Permission Errors
**Symptom**: Cannot write to context directories
**Solution**: Ensure the user has write permissions to `~/.shared-project-context/` directory. Create directory manually if needed:
```bash
mkdir -p ~/.shared-project-context/projects
```

## Architecture

This is a mature, production-ready system with:

- **Sophisticated Context Management**: Six specialized context types handling different content patterns
- **Template Validation**: Advanced markdown structure validation with project-specific customization
- **Archive System**: Automatic data preservation during destructive operations
- **ES Module Compatibility**: Modern JavaScript module support
- **Comprehensive Testing**: Extensive test suite with real filesystem validation
- **Type Safety**: Full TypeScript implementation with strict typing
- **Error Resilience**: Robust error handling and recovery mechanisms

The system is designed for persistent AI assistant collaboration, enabling context preservation and sharing across multiple AI sessions while maintaining data integrity and providing flexible content organization patterns.