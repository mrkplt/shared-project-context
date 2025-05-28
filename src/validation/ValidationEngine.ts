import { ContextTemplate, ValidationError } from '../types/template';

export class ValidationEngine {
  validateContent(content: string, template: ContextTemplate): {
    valid: boolean;
    errors: ValidationError[];
    confidence?: number;
  } {
    const errors: ValidationError[] = [];
    
    // 1. Parse markdown structure
    const parsed = this.parseMarkdown(content);
    
    // 2. Check required sections
    for (const section of template.schema.required_sections) {
      if (!parsed.sections.has(section)) {
        errors.push({
          type: 'missing_section',
          section,
          message: `Missing required section: ${section}`,
          severity: 'error',
          correction_prompt: template.correction_prompts[`missing_${section}`] || `Please add a ${section} section`,
          template_example: `## ${section}\nContent for ${section} goes here.`
        });
      }
    }
    
    // 3. Validate section content
    for (const [sectionName, sectionContent] of parsed.sections) {
      const sectionSchema = template.schema.section_schemas[sectionName];
      if (sectionSchema) {
        const sectionErrors = this.validateSection(sectionContent, sectionSchema, sectionName, template);
        errors.push(...sectionErrors);
      }
    }
    
    // 4. Format validation
    for (const rule of template.schema.format_rules) {
      if (!new RegExp(rule.pattern, 'm').test(content)) {
        errors.push({
          type: 'format_error',
          message: rule.message,
          severity: rule.severity || 'error',
          correction_prompt: template.correction_prompts.invalid_format || 'Please fix the format',
          template_example: template.examples[0] || ''
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      confidence: errors.length === 0 ? 1.0 : 1.0 - (errors.length / 10) // Simple confidence calculation
    };
  }
  
  private validateSection(
    content: string,
    schema: { min_length?: number; min_items?: number; format: string },
    sectionName: string,
    template: ContextTemplate
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check minimum length if specified
    if (schema.min_length && content.length < schema.min_length) {
      errors.push({
        type: 'content_quality',
        section: sectionName,
        message: `Section "${sectionName}" is too short. Minimum length: ${schema.min_length} characters`,
        severity: 'error',
        correction_prompt: `Please provide more content for the ${sectionName} section`,
        template_example: `## ${sectionName}\n${'x'.repeat(schema.min_length)}`
      });
    }
    
    // Check minimum items for list format
    if (schema.format === 'markdown_list' && schema.min_items) {
      const itemCount = content.split('\n').filter(line => line.trim().startsWith('- ')).length;
      if (itemCount < schema.min_items) {
        errors.push({
          type: 'content_quality',
          section: sectionName,
          message: `Section "${sectionName}" needs at least ${schema.min_items} items`,
          severity: 'error',
          correction_prompt: `Please add at least ${schema.min_items} items to the ${sectionName} section`,
          template_example: Array(schema.min_items).fill(0).map((_, i) => `- Item ${i + 1}`).join('\n')
        });
      }
    }
    
    return errors;
  }
  
  protected parseMarkdown(content: string): { sections: Map<string, string> } {
    const sections = new Map<string, string>();
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let sectionContent: string[] = [];
    
    for (const line of lines) {
      const sectionMatch = line.match(/^##\s+(.+)/);
      if (sectionMatch) {
        if (currentSection) {
          sections.set(currentSection, sectionContent.join('\n').trim());
        }
        currentSection = sectionMatch[1].toLowerCase().replace(/\s+/g, '-');
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }
    
    // Add the last section
    if (currentSection && sectionContent.length > 0) {
      sections.set(currentSection, sectionContent.join('\n').trim());
    }
    
    return { sections };
  }
}
