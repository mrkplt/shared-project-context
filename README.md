# MCP Context Server

A Model Context Protocol (MCP) server implementation for managing AI agent context files. This server provides tools for storing and retrieving context with validation, templates, and configurable context types per project.

## Features

- **Project-Based Organization**: Each project maintains its own contexts, templates, and configuration
- **Flexible Context Types**: Configure custom context types per project using base types
- **Template Validation**: Validate context against markdown templates with correction guidance
- **Archive System**: Automatic archiving of previous context on updates
- **MCP Protocol**: Full implementation for seamless AI assistant integration

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
4. Install globally (optional):
   ```bash
   npm run install-server
   ```

## Usage

### Starting the Server

```bash
npm start
```

Or if installed globally:
```bash
shared-project-context
```

### Available Tools

#### list_projects

Discover all available projects.

```typescript
await executeTool('list_projects', {});
// Returns: { success: true, data: ["project1", "project2"] }
```

#### create_project

Create a new project to store contexts.

```typescript
await executeTool('create_project', {
  project_name: 'my-project'
});
```

#### list_contexts

See what context types and files exist for a project.

```typescript
await executeTool('list_contexts', {
  project_name: 'my-project'
});
```

#### get_context

Retrieve context content.

```typescript
// Get single context file
await executeTool('get_context', {
  project_name: 'my-project',
  context_type: 'mental_model'
});

// Get named context (for 'named' file naming types)
await executeTool('get_context', {
  project_name: 'my-project',
  context_type: 'other',
  context_name: 'architecture-notes'
});
```

**Note**: For context types with `"fileNaming": "named"` (like freeform-document), you must always specify a `context_name`. Reading all files at once is not currently supported.

#### update_context

Update or create context with validation.

```typescript
// Update single-file context
await executeTool('update_context', {
  project_name: 'my-project',
  context_type: 'mental_model',
  content: '# Mental Model\n\n## Overview\n...'
});

// Create/update named context
await executeTool('update_context', {
  project_name: 'my-project',
  context_type: 'other',
  context_name: 'todo-list',
  content: '# TODOs\n\n- [ ] Task 1'
});
```

#### clear_context

Clear context (with archiving for safety).

```typescript
await executeTool('clear_context', {
  project_name: 'my-project',
  context_type: 'session_summary'
});
```

#### get_project_templates

Retrieve all templates for a project's validated context types.

```typescript
await executeTool('get_project_templates', {
  project_name: 'my-project'
});
```

## Configuration

### Important: Configuration

**Project configurations must be manually placed in the project directory.** The system looks for `project-config.json` in `~/.shared-project-context/projects/PROJECT_NAME/project-config.json`.

This is by design - configuration is a deliberate action that should be controlled by the user. Using the MCP tools to create a file named "project-config" will NOT activate the configuration.

### Default Project Configuration

New projects start with a minimal default configuration:

```json
{
  "contextTypes": [
    {
      "baseType": "freeform-document",
      "name": "general",
      "description": "Arbitrary named files for reference documents.",
      "fileNaming": "named",
      "validation": false
    }
  ]
}
```

This allows immediate use of the project for storing unstructured documents without any additional setup.

### Custom Project Configuration

To enable additional context types with validation and templates, manually create or update `project-config.json` in the project root:

```json
{
  "contextTypes": [
    {
      "baseType": "templated-log",
      "name": "session_summary",
      "description": "Chronological development log",
      "template": "session_summary",
      "fileNaming": "timestamped",
      "validation": true
    },
    {
      "baseType": "templated-document",
      "name": "mental_model",
      "description": "Technical architecture understanding",
      "template": "mental_model",
      "fileNaming": "single",
      "validation": true
    },
    {
      "baseType": "freeform-document",
      "name": "notes",
      "description": "Unstructured notes and references",
      "fileNaming": "named",
      "validation": false
    }
  ]
}
```

### Context Type Properties

- **baseType**: One of four base types (see below)
- **name**: Unique identifier for the context type
- **description**: Human-readable description shown in list_contexts
- **template**: Template name (without .md extension) for validation
- **fileNaming**: How files are named - `single`, `timestamped`, or `named`
- **validation**: Whether to validate against template

### Base Types

#### templated-document
- Single file per context type
- Replaces content on update (archives previous)
- Validates against template
- Use for: mental models, feature lists, architecture docs

#### freeform-document  
- Single or multiple named files
- No validation
- User controls filenames
- Requires `context_name` for all operations (cannot read all files at once)
- Use for: notes, references, arbitrary documents

#### templated-log
- Append-only with timestamps
- Each update creates new timestamped file
- Validates each entry against template
- Use for: session logs, changelogs, append-only records

#### log
- Like templated-log but without validation
- Use for: informal logs, debug output

### File Naming Strategies

- **single**: One file named `{context_type}.md`
- **timestamped**: Files named `{context_type}-{timestamp}.md`
- **named**: User specifies filename in MCP Tool call

## Creating Templates

**Templates are only needed after you've configured context types that use validation.** If you're using the default configuration or only freeform context types, no templates are required.

Templates define the expected structure for validated context types. Create templates in `PROJECT_ROOT/templates/` after configuring context types with `"validation": true`.

### Template Example (mental_model.md)

```markdown
# Mental Model
<!-- Last Updated: {{DATE}} -->

## System Overview
<!-- Confidence: High/Medium/Low -->
[Brief description]

## Components
<!-- Format: Component Name (Confidence: High/Medium/Low) -->
- **ComponentName**
  - Purpose: [description]
  - Location: [path]
  
## Data Flow
1. [Source] → [Process] → [Output]

## Key Decisions
1. **Decision**: [description]
   - Context: [why needed]
   - Chosen: [approach]
```

### Template Variables
This feature works but is not well vetted. LLMS will generally sort out the validation. Please submit bugs and fixes.

Templates support variable replacement:
- `{{DATE}}`: Current date/time
- `{{YYYY-MM-DD}}`: Current date
- `{{FEATURE_NAME}}`: Custom variables for specific templates

These are arbitrary (but useful to your robot). The content of these is  not validated. For example:

```markdown
## {{FEATURE_NAME}}
<!-- validation will require that the h2 is present but not the content following the space -->

## Session: {{SESSION_NAME}}
## Session Date: {{SESSION_DATE}}
<!-- The above examples woould require the words `Session: ` and `Session Date: ` to be present,
but the content could be anything else -->
```

## Defining New Context Types

### Step 1: Choose a Base Type

Decide which base type fits your use case:
- Need validation? Use `templated-*` types
- Need append behavior? Use `*-log` types
- Need multiple files? Use `freeform-document` with `named` filing

### Step 2: Create Template (if validated)

For validated types, create a template in `templates/`:

```bash
# In project directory
mkdir -p templates
cat > templates/my-template.md << 'EOF'
# My Custom Context Type
<!-- Generated: {{DATE}} -->

## Section One
[Content here]

## Section Two
[Content here]
EOF
```

### Step 3: Update project-config.json

Manually edit the `project-config.json` file in your project directory to add your context type:

```json
{
  "contextTypes": [
    // ... existing types ...
    {
      "baseType": "templated-document",
      "name": "my_context",
      "description": "My custom context for X purpose",  
      "template": "my-template",
      "fileNaming": "single",
      "validation": true
    }
  ]
}
```

### Step 4: Use Your Context Type

```typescript
// Update context
await update_context({
  project_name: "my-project",
  context_type: "my_context",
  content: "# My Custom Context Type\n<!-- Generated: 2025-06-19 -->\n\n## Section One\nMy content here"
});

// Read it back
const result = await get_context({
  project_name: "my-project",
  context_type: "my_context"
});
```

## Project Structure

```
~/.shared-project-context/
└── projects/
    └── my-project/
        ├── project-config.json    # Context type definitions
        ├── templates/             # Project-specific templates
        │   ├── mental_model.md
        │   └── session_summary.md
        ├── mental_model/          # Context files by type
        │   └── mental_model.md
        ├── session_summary/
        │   ├── session_summary-2025-06-19T12-00-00-000Z.md
        │   └── session_summary-2025-06-19T14-30-00-000Z.md
        ├── other/                 # Named contexts
        │   ├── architecture.md
        │   └── todo.md
        └── archive/               # Previous versions
            └── mental_model/
                └── 2025-06-19T13-45-00-000Z/
                    └── mental_model.md
```

## Development

### Running Tests

```bash
npm test           # Run all tests
npm test:watch    # Watch mode
npm test:coverage # With coverage report
```

### Building

```bash
npm run build     # TypeScript compilation
npm run dev       # Development mode with watch
```

### Code Structure

- `src/server.ts` - MCP server implementation
- `src/handlers/` - Request handlers for each tool
- `src/models/context_types/` - Context type implementations
- `src/models/contexTypeFactory.ts` - Dynamic type instantiation
- `src/models/context_types/utilities/` - FileSystem helper, validators
- `src/types.ts` - TypeScript interfaces

### Adding New Base Types

1. Create new class extending `BaseContextType`
2. Implements `ContextType` interface from `types.ts`
3. Add to `baseTypeMap` in `contexTypeFactory.ts`
4. Update TypeConfig interface if needed

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
      "fileNaming": "timestamped",
      "validation": true
    },
    {
      "baseType": "templated-document",
      "name": "mental_model",
      "description": "Current understanding of system architecture",
      "template": "mental_model",
      "fileNaming": "single",
      "validation": true
    },
    {
      "baseType": "templated-document",
      "name": "features",
      "description": "Feature implementation tracking",
      "template": "features",
      "fileNaming": "single",
      "validation": true
    },
    {
      "baseType": "freeform-document",
      "name": "docs",
      "description": "Project documentation",
      "fileNaming": "named",
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
      "baseType": "log",
      "name": "research_log",
      "description": "Daily research activities",
      "fileNaming": "timestamped",
      "validation": false
    },
    {
      "baseType": "freeform-document",
      "name": "papers",
      "description": "Paper summaries and notes",
      "fileNaming": "named",
      "validation": false
    },
    {
      "baseType": "templated-document",
      "name": "hypotheses",
      "description": "Current research hypotheses",
      "template": "hypotheses",
      "fileNaming": "single",
      "validation": true
    }
  ]
}
```

## Troubleshooting

### Context type not found
Ensure the context type is defined in `project-config.json` and that the file is located at `~/.shared-project-context/projects/PROJECT_NAME/project-config.json`. Files created through the MCP tools (e.g., in the "other" context) will not be recognized as configuration.

### Validation errors
Check that content matches the template structure. Use `get_project_templates` to see expected format.

### Missing templates
Templates are only required for context types with `"validation": true`. They are copied from the repository's `templates/` directory on first use. If you haven't configured any validated context types, you don't need templates. You may create and reference your own templates in the `templates/` directory of a project.

### Missing project config
Ensure the project config is located at `~/.shared-project-context/projects/PROJECT_NAME/project-config.json`. If the MCP server fails to find this file, it will create one with a default configuration.

