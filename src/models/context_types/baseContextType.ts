import { ContextType, ContextTypeArgs, ContexTypeResponse, ValidationResponse, TypeConfig } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';
import { MarkdownTemplateValidator } from './utilities/MarkdownTemplateValidator.js';

export abstract class BaseContextType implements ContextType {
  public readonly persistenceHelper: FileSystemHelper;
  protected readonly projectName: string;
  protected readonly contextName?: string;
  protected readonly content?: string;
  protected readonly config: TypeConfig;
  protected validator?: MarkdownTemplateValidator;

  constructor(args: ContextTypeArgs, config: TypeConfig) {
    this.persistenceHelper = args.persistenceHelper;
    this.projectName = args.projectName;
    this.contextName = args.contextName;
    this.content = args.content;
    this.config = config;
    
    if (config.validation && config.template) {
      this.validator = new MarkdownTemplateValidator(this.persistenceHelper, this.projectName);
    }
  }

  abstract update(): Promise<ContexTypeResponse>;
  abstract read(): Promise<ContexTypeResponse>;
  abstract reset(): Promise<ContexTypeResponse>;
  
  async validate(): Promise<ValidationResponse> {
    if (!this.config.validation) {
      return { isValid: true };
    }
    
    if (!this.config.template) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: 'Validation enabled but no template specified in configuration'
        }],
        correctionGuidance: [
          'Set validation: false to disable validation',
          'Or specify template: "template-name" to enable validation'
        ]
      };
    }
    
    if (!this.validator) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: 'Validation system not properly initialized'
        }],
        correctionGuidance: [
          'Check that both validation and template are properly configured'
        ]
      };
    }
    
    const trimmedContent = this.content?.trim() || '';
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: `${this.config.name} cannot be empty`
        }],
        correctionGuidance: [
          `1. Add content for ${this.config.name}`,
          '2. Ensure content is not just whitespace'
        ]
      };
    }
    
    return await this.validator.validateAgainstTemplate(trimmedContent, this.config.template);
  }
}