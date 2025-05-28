export type ValidationError = {
  type: 'missing_section' | 'format_error' | 'content_quality' | 'schema_violation';
  section?: string;
  message: string;
  severity: 'error' | 'warning';
  correction_prompt: string;
  template_example: string;
};

export interface SectionSchema {
  name: string;
  required: boolean;
  format: 'markdown' | 'markdown_list' | 'freeform' | 'structured';
  min_length?: number;
  min_items?: number;
  pattern?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  confidence?: number;
}

export interface ContextTemplate {
  name: string;
  description: string;
  schema: {
    required_sections: string[];
    section_schemas: Record<string, SectionSchema>;
    format_rules: Array<{
      pattern: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
  };
  correction_prompts: Record<string, string>;
  examples: string[];
}
