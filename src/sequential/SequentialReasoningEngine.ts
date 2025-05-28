import { ValidationEngine } from '../validation/ValidationEngine';
import { ContextTemplate, ValidationError, ValidationResult } from '../types/template';

export interface CorrectionGuidance {
  primary_issue: string;
  step_by_step_fix: string[];
  template_to_follow: string;
  example_fix: string;
  retry_instructions: string;
}

export interface CorrectionResponse {
  status: 'success' | 'correction_needed' | 'max_attempts_reached';
  validation_result?: ValidationResult;
  correction_guidance?: CorrectionGuidance;
  attempt_count: number;
}

export class SequentialReasoningEngine {
  private readonly maxAttempts = 3;

  constructor(private validationEngine: ValidationEngine) {}

  async processUpdate(
    projectId: string,
    fileType: string,
    content: string,
    attemptCount: number = 0
  ): Promise<CorrectionResponse> {
    const template = await this.getTemplate(fileType);
    const validation = this.validationEngine.validateContent(content, template);
    
    if (validation.valid) {
      return { status: 'success', attempt_count: attemptCount };
    }
    
    if (attemptCount >= this.maxAttempts) {
      return { 
        status: 'max_attempts_reached',
        validation_result: validation,
        attempt_count: attemptCount
      };
    }
    
    // Generate correction guidance
    const guidance = this.generateCorrectionGuidance(validation, template, content);
    
    return {
      status: 'correction_needed',
      validation_result: validation,
      correction_guidance: guidance,
      attempt_count: attemptCount
    };
  }
  
  protected async getTemplate(fileType: string): Promise<ContextTemplate> {
    // In a real implementation, this would load the template from the project
    // For now, return a basic template
    return {
      name: 'Default Template',
      description: 'Default validation template',
      schema: {
        required_sections: [],
        section_schemas: {},
        format_rules: []
      },
      correction_prompts: {},
      examples: []
    };
  }

  protected generateCorrectionGuidance(
    validation: ValidationResult,
    template: ContextTemplate,
    originalContent: string
  ): CorrectionGuidance {
    if (!validation.errors || validation.errors.length === 0) {
      throw new Error('No validation errors provided for correction guidance');
    }

    // Find the most critical error
    const criticalError = validation.errors
      .filter(e => e.severity === 'error')
      .sort((a, b) => this.getErrorPriority(a.type) - this.getErrorPriority(b.type))[0] || validation.errors[0];

    // Generate guidance based on error type
    switch (criticalError.type) {
      case 'missing_section':
        return this.generateMissingSectionGuidance(criticalError, template);
      case 'content_quality':
        return this.generateContentQualityGuidance(criticalError, template, originalContent);
      case 'format_error':
        return this.generateFormatErrorGuidance(criticalError, template, originalContent);
      default:
        return this.generateGenericGuidance(criticalError, template);
    }
  }

  private getErrorPriority(errorType: string): number {
    const priorityMap: Record<string, number> = {
      'missing_section': 1,
      'format_error': 2,
      'content_quality': 3,
      'schema_violation': 4
    };
    return priorityMap[errorType] || 5;
  }

  private generateMissingSectionGuidance(
    error: ValidationError,
    template: ContextTemplate
  ): CorrectionGuidance {
    const sectionName = error.section || 'the required section';
    const example = error.template_example || template.examples[0] || '';
    
    return {
      primary_issue: `The document is missing a required section: ${sectionName}`,
      step_by_step_fix: [
        `1. Add a new section with the heading: "## ${sectionName}"`,
        '2. Add relevant content for this section',
        '3. Ensure the section follows the expected format'
      ],
      template_to_follow: `## ${sectionName}\n[Your content here]`,
      example_fix: example,
      retry_instructions: `Please add the ${sectionName} section with appropriate content and try again.`
    };
  }

  private generateContentQualityGuidance(
    error: ValidationError,
    template: ContextTemplate,
    originalContent: string
  ): CorrectionGuidance {
    const sectionName = error.section ? ` (${error.section})` : '';
    
    return {
      primary_issue: `Content quality issue${sectionName}: ${error.message}`,
      step_by_step_fix: [
        '1. Review the section content',
        '2. Add more details or improve the quality',
        '3. Ensure it meets the requirements'
      ],
      template_to_follow: error.template_example || template.examples[0] || '',
      example_fix: error.template_example || template.examples[0] || '',
      retry_instructions: error.correction_prompt || 'Please improve the content and try again.'
    };
  }

  private generateFormatErrorGuidance(
    error: ValidationError,
    template: ContextTemplate,
    originalContent: string
  ): CorrectionGuidance {
    return {
      primary_issue: `Format error: ${error.message}`,
      step_by_step_fix: [
        '1. Check the document structure',
        '2. Follow the required format',
        '3. Ensure proper headings and sections'
      ],
      template_to_follow: template.examples[0] || '',
      example_fix: template.examples[0] || '',
      retry_instructions: error.correction_prompt || 'Please correct the format and try again.'
    };
  }

  private generateGenericGuidance(
    error: ValidationError,
    template: ContextTemplate
  ): CorrectionGuidance {
    return {
      primary_issue: error.message || 'An issue was found with the content',
      step_by_step_fix: [
        '1. Review the content',
        '2. Make necessary corrections',
        '3. Ensure it follows the template'
      ],
      template_to_follow: template.examples[0] || '',
      example_fix: error.template_example || template.examples[0] || '',
      retry_instructions: error.correction_prompt || 'Please fix the issues and try again.'
    };
  }
}
