import { ValidationResponse, ContextType, ContexTypeResponse, PersistenceResponse } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class FeaturesType implements ContextType {
  private static readonly DEFAULT_FILE_NAME = 'features';
  
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
    this.contextName = FeaturesType.DEFAULT_FILE_NAME || contextName; // Disregard contextName if provided
  }

  async update(content: string): Promise<ContexTypeResponse> {
      const result = await this.persistenceHelper.writeContext(
        this.projectName, this.contextName, this.contextName, content
      );

      if (!result.success) {
        return { success: false, errors: result.errors };
      }
      
      return { success: true };
  }

  async read(): Promise<ContexTypeResponse> {
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
        'features',  // contextType
        'features'
    );

    if (!result.success) {
      return { 
        success: false, 
        errors: result.errors || ['Failed to reset features'] 
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
          '1. Add a description of the features',
          '2. Include relevant details about functionality',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }
}