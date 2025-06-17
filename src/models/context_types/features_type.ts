import { ValidationResponse, ContextType, ContexTypeResponse, PersistenceResponse, ContextTypeArgs } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';
import { MarkdownTemplateValidator } from '../../validation/MarkdownTemplateValidator.js';

export class FeaturesType implements ContextType {
  private static readonly DEFAULT_FILE_NAME = 'features';
  
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly contextName: string;
  private readonly content: string | undefined;
  private validator: MarkdownTemplateValidator;

  constructor(args: ContextTypeArgs) {
    this.persistenceHelper = args.persistenceHelper;
    this.projectName = args.projectName;
    this.contextName = FeaturesType.DEFAULT_FILE_NAME || args.contextName; // Disregard contextName if provided
    this.content = args.content;
    this.validator = new MarkdownTemplateValidator(this.persistenceHelper);
  }

  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: ['Content is required to update features']
      };
    }

    const archiveResult = await this.reset();
    if (!archiveResult.success) {
      return {
        success: false,
        errors: archiveResult.errors
      };
    }

    const result = await this.persistenceHelper.writeContext(
      this.projectName, 'features', 'features', this.content
    );

    if (!result.success) {
      return { success: false, errors: result.errors };
    }
    
    return { success: true };
  }

  async read(): Promise<ContexTypeResponse> {
    const result: PersistenceResponse = 
      await this.persistenceHelper.getContext(this.projectName, 'features', ['features']);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }
    
    return { success: true, content: result.data?.join('\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.archiveContext(
        this.projectName,
        'features',  // contextType
        ['features']
    );

    if (!result.success) {
      return { 
        success: false, 
        errors: result.errors || ['Failed to reset features'] 
      };
    };
    
    return { success: true };
}

  validate(): ValidationResponse {
    const trimmedContent = this.content?.trim() || '';
    
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: 'Content cannot be empty'
        }],
        correctionGuidance: [
          '1. Add a description of the features',
          '2. Include relevant details about functionality',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }

  async validateAsync(): Promise<ValidationResponse> {
    const trimmedContent = this.content?.trim() || '';
    
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: 'Content cannot be empty'
        }],
        correctionGuidance: [
          '1. Add a description of the features',
          '2. Include relevant details about functionality',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return await this.validator.validateAgainstTemplate(trimmedContent, 'features');
  }
}