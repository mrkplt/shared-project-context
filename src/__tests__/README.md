# Template Variable System Tests

This directory contains comprehensive tests for the template variable normalization system used in the Markdown Template Validator.

## Overview

The template variable system allows templates to contain flexible placeholders that can match any actual content while maintaining structural validation. This enables templates to be reusable across different projects and contexts.

## How It Works

### Template Variables
Template variables are defined using double braces: `{{VARIABLE_NAME}}`

Examples:
- `{{PROJECT_NAME}}`
- `{{DATE}}`
- `{{VERSION}}`
- `{{AUTHOR}}`
- `{{CUSTOM_FIELD}}`

### Normalization Process

1. **Variable Detection**: The system detects any content within `{{}}` braces
2. **Pattern Generation**: Converts template lines to regex patterns where variables become `.*` wildcards
3. **Flexible Matching**: Uses regex matching for lines with variables, exact matching for static content

### Example Transformations

| Template | Normalized Pattern | Matches |
|----------|-------------------|---------|
| `# Project: {{PROJECT_NAME}}` | `# Project: .*` | `# Project: My App`, `# Project: E-commerce Platform` |
| `## Version {{VERSION}} - {{DATE}}` | `## Version .* - .*` | `## Version 2.1.0 - 2024-01-15`, `## Version 1.0.0 - March 15th` |
| `### {{FEATURE}}: {{DESCRIPTION}}` | `### .*: .*` | `### Auth: User login system`, `### API: REST endpoints` |

## Test Coverage

### Single Variables
- Basic variable matching with any content
- Date variables with various formats
- Variables with whitespace in braces

### Multiple Variables
- Adjacent variables (`{{VAR1}}{{VAR2}}`)
- Variables with separators (`{{VAR1}} - {{VAR2}}`)
- Complex punctuation scenarios
- Variables at start/end of lines
- Many variables in one line

### Real-World Examples
- Project documentation headers
- Feature specification patterns
- Technical documentation templates
- Business logic descriptions

### Edge Cases
- Special regex characters in content
- Malformed braces (treated as literal text)
- Empty braces (treated as literal text)
- Variables with special characters in names
- Mixed static and variable content

## Benefits

1. **Flexibility**: Templates work with any actual values
2. **Maintainability**: One template serves multiple projects
3. **Validation**: Still enforces structural requirements
4. **Extensibility**: New variable types work automatically

## Usage in Validation

When validating content against a template:

1. **Lines without variables**: Must match exactly
2. **Lines with variables**: Match if the surrounding structure is correct
3. **Missing sections**: Still flagged as validation errors
4. **Extra sections**: Still flagged as validation errors

This approach balances flexibility (allowing varied content) with structure enforcement (maintaining required sections and hierarchy).