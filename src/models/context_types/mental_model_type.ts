import { ValidationResponse, ContextType, ContexTypeResponse, PersistenceResponse } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class MentalModelType implements ContextType {
  private static readonly DEFAULT_FILE_NAME = 'mental_model';
  
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly contextName: string;

  constructor(
    persistenceHelper: FileSystemHelper,
    projectName: string,
    contextName?: string
  ) {
    this.persistenceHelper = persistenceHelper;
    this.projectName = projectName;
    this.contextName = MentalModelType.DEFAULT_FILE_NAME || contextName; // Disregard contextName if provided
  }

  private validateName(name?: string): ValidationResponse {
    if (name && name !== 'mental_model') {
      return {
        isValid: false,
        validationErrors: ['invalid_name', 'If provided, name must be "mental_model"'],
        correctionGuidance: [
          '1. Remove the name parameter, or',
          '2. Set the name parameter to "mental_model"'
        ]
      };
    }
    return { isValid: true };
  }

  async update(content: string): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.writeContext(
      this.projectName, 
      this.contextName, 
      this.contextName, 
      content
    );

    if (!result.success) {
      return { success: false, errors: result.errors };
    }
    
    return { success: true };
  }

  async read(_name?: string): Promise<ContexTypeResponse> {
    const nameValidation = this.validateName(_name);
    if (!nameValidation.isValid) {
      return {
        success: false,
        content: '',
        errors: [nameValidation.validationErrors?.join(' - ') || 'Invalid name parameter']
      };
    }

    const result: PersistenceResponse = 
      await this.persistenceHelper.getContext(this.projectName, this.contextName);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }
    
    return { success: true, content: result.data?.join('\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.archiveContext(
      this.projectName,
      'mental_model',  // contextType
      'mental_model'   // contextName
    );

    if (!result.success) {
      return { 
        success: false, 
        errors: result.errors || ['Failed to reset mental model'] 
      };
    };
    
    return { success: true };
  }

  validate(content: string): ValidationResponse {
    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 
          'Content cannot be empty', 
          'error'
        ],
        correctionGuidance: [
          '1. Add a description of the mental model',
          '2. Include relevant concepts and relationships',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }
}