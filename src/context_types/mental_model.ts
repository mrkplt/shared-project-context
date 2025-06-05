import { ValidationResponse, ContextType, PersistenceResponse, ReadResponse } from '../types.js';

export class MentalModelType implements ContextType {
  private readonly fileName = 'mental_model.md';

  constructor(
    private projectName: string,
    private persistenceHelper: any, // Your existing FileSystemHelper,
  ) {}

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

  async update(_name: string | undefined, content: string): Promise<PersistenceResponse> {
    const nameValidation = this.validateName(_name);
    if (!nameValidation.isValid) {
      return {
        success: false,
        error: nameValidation.validationErrors?.join(' - ') || 'Invalid name parameter'
      };
    }
    
    const filePath = `${this.projectName}/${this.fileName}`;
    
    try {
      await this.persistenceHelper.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async read(_name?: string): Promise<ReadResponse> {
    const nameValidation = this.validateName(_name);
    if (!nameValidation.isValid) {
      return {
        success: false,
        content: '',
        error: nameValidation.validationErrors?.join(' - ') || 'Invalid name parameter'
      };
    }
    
    const filePath = `${this.projectName}/${this.fileName}`;
    
    try {
      const content = await this.persistenceHelper.readFile(filePath);
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async reset(_name?: string): Promise<PersistenceResponse> {
    const nameValidation = this.validateName(_name);
    if (!nameValidation.isValid) {
      return {
        success: false,
        error: nameValidation.validationErrors?.join(' - ') || 'Invalid name parameter'
      };
    }
    
    const filePath = `${this.projectName}/${this.fileName}`;
    
    try {
      // Archive the file first
      const timestamp = new Date().toISOString().split('T')[0];
      const archivePath = `${this.projectName}/archives/${timestamp}/${this.fileName}`;
      
      // Ensure archive directory exists
      await this.persistenceHelper.ensureDirectoryExists(`${this.projectName}/archives/${timestamp}`);
      
      // Move file to archive
      await this.persistenceHelper.archive(filePath, archivePath);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        // File doesn't exist, nothing to reset
        return {
          success: false,
          error: `Failed to reset file: ${error.message}`
        };
      }
      return { success: false, error: 'Unknown error during reset' };
    }
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