import { ValidationError, CorrectionGuidance } from './types';

/**
 * Validation result from checking content against a schema
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  correctionGuidance?: CorrectionGuidance;
}

/**
 * Validates content against a JSON schema and provides correction guidance
 */
export function validateContent(
  content: string,
  schema: object
): ValidationResult {
  const errors: ValidationError[] = [];
  const requiredSections = new Set<string>();

  // Check for empty content
  if (!content.trim()) {
    errors.push({
      message: 'Content cannot be empty',
      path: '',
      suggestion: 'Add content to the document'
    });
    requiredSections.add('title');
    requiredSections.add('sections');
  } else {
    // Check for title
    if (!content.startsWith('# ')) {
      errors.push({
        message: 'Document must start with a level 1 heading (title)',
        path: 'title',
        suggestion: 'Add a title starting with # '
      });
      requiredSections.add('title');
    }

    // Check for sections (## headings)
    const sectionMatches = content.match(/^##\s+.+$/gm);
    if (!sectionMatches || sectionMatches.length === 0) {
      errors.push({
        message: 'Document must contain at least one section (## heading)',
        path: 'sections',
        suggestion: 'Add sections using ## Section Name'
      });
      requiredSections.add('sections');
    } else {
      // Check for empty sections
      const sections = content.split(/^##\s+/gm).slice(1);
      sections.forEach((section, index) => {
        const [firstLine, ...rest] = section.split('\n');
        const sectionContent = rest.join('\n').trim();
        if (!sectionContent) {
          errors.push({
            message: `Section "${firstLine.trim()}" is empty`,
            path: `sections[${index}]`,
            suggestion: 'Add content below the section heading'
          });
        }
      });
    }
  }

  // Generate correction guidance if there are errors
  let correctionGuidance: CorrectionGuidance | undefined;
  if (errors.length > 0) {
    const missingSections = Array.from(requiredSections);
    
    correctionGuidance = {
      retryInstructions: 'Please address the validation errors above.',
    };

    if (missingSections.length > 0) {
      correctionGuidance.requiredSections = missingSections;
      correctionGuidance.retryInstructions = `Please add the following required sections: ${missingSections.join(', ')}.`;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    ...(correctionGuidance ? { correctionGuidance } : {})
  };
}

// Schema for mental model documents
export const MENTAL_MODEL_SCHEMA = {
  type: 'object',
  required: ['title', 'sections'],
  properties: {
    title: { type: 'string', minLength: 1 },
    sections: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'content'],
        properties: {
          name: { type: 'string', minLength: 1 },
          content: { type: 'string', minLength: 1 }
        }
      }
    }
  }
};

// Schema for session summary documents
export const SESSION_SUMMARY_SCHEMA = {
  type: 'object',
  required: ['title', 'changes'],
  properties: {
    title: { type: 'string', minLength: 1 },
    changes: {
      type: 'object',
      required: ['added', 'changed', 'fixed'],
      properties: {
        added: { type: 'array', items: { type: 'string' } },
        changed: { type: 'array', items: { type: 'string' } },
        fixed: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};
