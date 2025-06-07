import { ValidationResponse, ContextType, PersistenceResponse } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class OtherType implements ContextType {
  private static readonly FILE_PREFIX = 'other_';
  
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly fileName: string;

  /**
   * Creates a new OtherType instance for handling arbitrary file types
   * @param projectName - Name of the project this context belongs to
   * @param persistenceHelper - Helper for file system operations
   */
  constructor(
    persistenceHelper: FileSystemHelper,
    projectName: string,
    fileName: string
  ) {
    this.persistenceHelper = persistenceHelper;
    this.projectName = projectName;
    this.fileName = fileName;
  }

  async update(content: string): Promise<PersistenceResponse> {
    // Add Validation Behavior here that sets ValidationResponse
    const validation = this.validate(content);
    if (!validation.isValid) {
      return {
        success: false,
        validation,
        errors: ['Content validation failed']
      };
    }

    const filename = `${OtherType.FILE_PREFIX}${this.fileName}.md`;
    const filePath = `${this.projectName}/${filename}`;
    
    try {
      await this.persistenceHelper.writeContent(this.projectName, filename, content);
      return {
        success: true,
        validation
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async read(): Promise<PersistenceResponse> {
    const filename = `other_${this.fileName}.md`;

    try {
      const content = await this.persistenceHelper.getContext(this.projectName, filename);
      return {
        success: true,
        content: content

      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async reset(name?: string): Promise<PersistenceResponse> {
    if (!name) {
      return {
        success: false,
        errors: ['Name parameter is required for other type']
      };
    }

    const filename = `other_${name}.md`;
    const filePath = `${this.projectName}/${filename}`;
    
    try {
      await this.persistenceHelper.archiveContext(this.projectName, filename);
    } catch (error) {
      if (error instanceof Error) {
        // File doesn't exist, nothing to reset
        return {
          success: false,
          errors: [`Failed to reset file: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }

    return {
      success: true
    };
  }

  validate(content: string): ValidationResponse {
    // Minimal validation for other type
    const trimmedContent = content.trim();
     
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 'Content cannot be empty', 'error'
        ],
        correctionGuidance: [
          '1. Add meaningful content to your file',
          '2. Include relevant information for your use case',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }

  async listAllContext(): Promise<string[]> {
    return await this.persistenceHelper.listAllContextForProject(`${this.projectName}/other`);
  }
}