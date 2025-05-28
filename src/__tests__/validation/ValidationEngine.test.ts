import { ValidationEngine } from '../../validation/ValidationEngine';
import { ContextTemplate } from '../../types/template';

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;
  let testTemplate: ContextTemplate;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
    
    testTemplate = {
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
            severity: 'error'
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
      ]
    };
  });

  describe('validateContent', () => {
    it('should validate required sections', () => {
      const content = '# Test\n\n## Overview\nTest content';
      
      const result = validationEngine.validateContent(content, testTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        type: 'missing_section',
        section: 'components',
        message: 'Missing required section: components',
        severity: 'error',
        correction_prompt: testTemplate.correction_prompts.missing_components,
        template_example: expect.any(String)
      });
    });

    it('should validate section content', () => {
      const content = '# Test\n\n## Overview\nToo short\n\n## Components\n- Item 1';
      
      const result = validationEngine.validateContent(content, testTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        type: 'content_quality',
        section: 'overview',
        message: 'Section "overview" is too short. Minimum length: 10 characters',
        severity: 'error',
        correction_prompt: expect.any(String),
        template_example: expect.any(String)
      });
    });

    it('should validate document format', () => {
      const content = 'Invalid format\n## Overview\nTest content\n## Components\n- Item 1';
      
      const result = validationEngine.validateContent(content, testTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        type: 'format_error',
        message: 'Document must start with a level 1 heading',
        severity: 'error',
        correction_prompt: testTemplate.correction_prompts.invalid_format,
        template_example: expect.any(String)
      });
    });

    it('should return valid for correctly formatted content', () => {
      const content = '# Test Project\n\n## Overview\nThis is a test project with a valid overview.\n\n## Components\n- Component 1\n- Component 2';
      
      const result = validationEngine.validateContent(content, testTemplate);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('parseMarkdown', () => {
    it('should parse markdown sections', () => {
      const content = '# Title\n\n## Section 1\nContent 1\n\n## Section 2\nContent 2';
      
      const result = (validationEngine as any).parseMarkdown(content);
      
      expect(result.sections.has('section-1')).toBe(true);
      expect(result.sections.get('section-1')).toBe('Content 1');
      expect(result.sections.has('section-2')).toBe(true);
      expect(result.sections.get('section-2')).toBe('Content 2');
    });
  });
});
