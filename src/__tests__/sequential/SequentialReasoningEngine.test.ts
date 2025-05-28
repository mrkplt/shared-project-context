import { SequentialReasoningEngine } from '../../sequential/SequentialReasoningEngine';
import { ValidationEngine } from '../../validation/ValidationEngine';
import { ContextTemplate, ValidationError } from '../../types/template';

describe('SequentialReasoningEngine', () => {
  let engine: SequentialReasoningEngine;
  let mockValidationEngine: jest.Mocked<ValidationEngine>;
  let testTemplate: ContextTemplate;

  beforeEach(() => {
    mockValidationEngine = {
      validateContent: jest.fn(),
    } as unknown as jest.Mocked<ValidationEngine>;

    engine = new SequentialReasoningEngine(mockValidationEngine);

    testTemplate = {
      name: 'Test Template',
      description: 'Test template description',
      schema: {
        required_sections: ['overview'],
        section_schemas: {
          overview: {
            name: 'Overview',
            required: true,
            format: 'markdown',
            min_length: 10
          }
        },
        format_rules: []
      },
      correction_prompts: {
        missing_overview: 'Please add an overview section',
        invalid_format: 'Document must follow the template format'
      },
      examples: ['# Test\n\n## Overview\nTest content']
    };
  });

  describe('processUpdate', () => {
    it('should return success for valid content', async () => {
      const content = '# Test\n\n## Overview\nValid content that meets requirements';
      
      mockValidationEngine.validateContent.mockReturnValue({
        valid: true,
        errors: []
      });

      const result = await engine.processUpdate('test-project', 'test-file', content);
      
      expect(result.status).toBe('success');
      expect(result.attempt_count).toBe(0);
    });

    it('should return correction needed for invalid content', async () => {
      const content = '# Test\n\n## Overview\nToo short';
      const validationError: ValidationError = {
        type: 'content_quality',
        section: 'overview',
        message: 'Section "overview" is too short. Minimum length: 10 characters',
        severity: 'error',
        correction_prompt: 'Please provide more details in the overview',
        template_example: '## Overview\nDetailed project description...'
      };
      
      mockValidationEngine.validateContent.mockReturnValue({
        valid: false,
        errors: [validationError]
      });

      const result = await engine.processUpdate('test-project', 'test-file', content);
      
      expect(result.status).toBe('correction_needed');
      expect(result.attempt_count).toBe(0);
      expect(result.validation_result?.errors).toContainEqual(validationError);
      expect(result.correction_guidance).toBeDefined();
    });

    it('should track attempt count', async () => {
      const content = '# Test\n\n## Overview\nShort';
      
      mockValidationEngine.validateContent.mockReturnValue({
        valid: false,
        errors: [{
          type: 'content_quality',
          section: 'overview',
          message: 'Section too short',
          severity: 'error',
          correction_prompt: 'Add more content',
          template_example: '## Overview\nDetailed content'
        }]
      });

      // First attempt
      let result = await engine.processUpdate('test-project', 'test-file', content, 1);
      expect(result.attempt_count).toBe(1);

      // Second attempt
      result = await engine.processUpdate('test-project', 'test-file', content, 2);
      expect(result.attempt_count).toBe(2);
    });

    it('should return max_attempts_reached after maximum retries', async () => {
      const content = '# Test\n\n## Overview\nShort';
      
      mockValidationEngine.validateContent.mockReturnValue({
        valid: false,
        errors: [{
          type: 'content_quality',
          section: 'overview',
          message: 'Section too short',
          severity: 'error',
          correction_prompt: 'Add more content',
          template_example: '## Overview\nDetailed content'
        }]
      });

      const result = await engine.processUpdate('test-project', 'test-file', content, 3);
      
      expect(result.status).toBe('max_attempts_reached');
      expect(result.attempt_count).toBe(3);
      expect(result.validation_result).toBeDefined();
    });
  });

  describe('generateCorrectionGuidance', () => {
    it('should generate guidance for missing section', () => {
      const validation = {
        valid: false,
        errors: [{
          type: 'missing_section',
          section: 'overview',
          message: 'Missing required section: overview',
          severity: 'error' as const,
          correction_prompt: 'Please add an overview section',
          template_example: '## Overview\nProject description...'
        }]
      };

      const guidance = (engine as any).generateCorrectionGuidance(
        validation,
        testTemplate,
        '# Test\n\nNo overview here!'
      );

      expect(guidance.primary_issue).toBe('The document is missing a required section: overview');
      expect(guidance.step_by_step_fix).toEqual([
        '1. Add a new section with the heading: "## overview"',
        '2. Add relevant content for this section',
        '3. Ensure the section follows the expected format'
      ]);
      expect(guidance.template_to_follow).toBe('## overview\n[Your content here]');
      expect(guidance.example_fix).toBe('## Overview\nProject description...');
    });

    it('should generate guidance for content quality issues', () => {
      const validation = {
        valid: false,
        errors: [{
          type: 'content_quality',
          section: 'overview',
          message: 'Section is too short',
          severity: 'error' as const,
          correction_prompt: 'Please provide more details',
          template_example: '## Overview\nDetailed description...'
        }]
      };

      const guidance = (engine as any).generateCorrectionGuidance(
        validation,
        testTemplate,
        '# Test\n\n## Overview\nShort'
      );

      expect(guidance.primary_issue).toBe('Content quality issue (overview): Section is too short');
      expect(guidance.step_by_step_fix).toEqual([
        '1. Review the section content',
        '2. Add more details or improve the quality',
        '3. Ensure it meets the requirements'
      ]);
      expect(guidance.retry_instructions).toBe('Please provide more details');
    });
  });
});
