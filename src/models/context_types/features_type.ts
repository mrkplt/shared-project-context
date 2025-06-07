import { ValidationResponse, ContextType, PersistenceResponse } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class FeaturesType implements ContextType {
  private static readonly DEFAULT_FILE_NAME = 'features';
  
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly fileName: string;

  constructor(
    persistenceHelper: FileSystemHelper,
    projectName: string,
    fileName?: string
  ) {
    this.persistenceHelper = persistenceHelper;
    this.projectName = projectName;
    this.fileName = FeaturesType.DEFAULT_FILE_NAME || fileName; // Disregard fileName if provided
  }

  async update(content: string): Promise<PersistenceResponse> {
    const filePath = `${this.projectName}/${this.fileName}`;
    
    try {
      await this.persistenceHelper.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async read(): Promise<PersistenceResponse> {
    const filePath = `${this.projectName}/${this.fileName}`;
    
    try {
      const content = await this.persistenceHelper.readFile(filePath);
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        content: '',
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async reset(): Promise<PersistenceResponse> {
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
          errors: [`Failed to reset file: ${error.message}`]
        };
      }
      return { success: false, errors: ['Unknown error during reset'] };
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
          '1. Add a description of the features',
          '2. Include relevant details about functionality',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }
}