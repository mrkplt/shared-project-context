import { ContextTemplate, ValidationError } from '../types/template';

type MockValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  confidence?: number;
};

export const createMockValidationResult = (
  valid: boolean = true,
  errors: ValidationError[] = []
): MockValidationResult => ({
  valid,
  errors,
  confidence: valid ? 1.0 : 0.0,
});

export const createMockTemplate = (overrides: Partial<ContextTemplate> = {}): ContextTemplate => ({
  name: 'Test Template',
  description: 'Test template description',
  schema: {
    required_sections: ['overview', 'components'],
    section_schemas: {
      overview: {
        name: 'Overview',
        required: true,
        format: 'markdown',
        min_length: 10
      },
      components: {
        name: 'Components',
        required: true,
        format: 'markdown_list',
        min_items: 1
      }
    },
    format_rules: [
      {
        pattern: '^# .+',
        message: 'Document must start with a level 1 heading',
        severity: 'error' as const
      }
    ]
  },
  correction_prompts: {
    missing_overview: 'Please add an overview section',
    missing_components: 'Please add a components section',
    invalid_format: 'Document must start with a level 1 heading'
  },
  examples: [
    '# Project Name\n\n## Overview\nProject description...\n\n## Components\n- Component 1\n- Component 2'
  ],
  ...overrides
});

export const createMockValidationError = (overrides: Partial<ValidationError> = {}): ValidationError => ({
  type: 'missing_section',
  section: 'test-section',
  message: 'Test validation error',
  severity: 'error',
  correction_prompt: 'Please fix this issue',
  template_example: 'Example content',
  ...overrides
});

// Helper to wait for async operations in tests
export const flushPromises = () => new Promise(setImmediate);
