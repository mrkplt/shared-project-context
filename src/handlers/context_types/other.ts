import { ValidationResponse, ContextType, PersistenceResponse, ReadResponse } from '../../types.js';

export class OtherType implements ContextType {
  constructor(
    private projectName: string,
    private persistenceHelper: any, // Your existing FileSystemHelper,
  ) {}

  async update(name: string, content: string): Promise<PersistenceResponse> {
    // Add Validation Behavior here that sets ValidationResponse

    // this should create a other directory and persist to that.
    // This is actually a file system implemnentation detail but 
    // it's fine here for now.
    const filename = `other_${name}.md`;
    const filePath = `${this.projectName}/${filename}`;
    
    try {
      await this.persistenceHelper.writeFile(filePath, content);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async read(name: string): Promise<ReadResponse> {
    const filename = `other_${name}.md`;
    const filePath = `${this.projectName}/${filename}`;
    let content: string = ``;

    try {
      content = await this.persistenceHelper.readFile(filePath);
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          content: content,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    return {
      success: true,
      content: content
    };
  }

  async reset(name: string): Promise<PersistenceResponse> {
    const filename = `other_${name}.md`;
    const filePath = `${this.projectName}/${filename}`;
    
    try {
      // Archive the file first
      const timestamp = new Date().toISOString().split('T')[0];
      const archivePath = `${this.projectName}/archives/${timestamp}/${filename}`;
      
      // Ensure archive directory exists
      await this.persistenceHelper.ensureDirectoryExists(`${this.projectName}/archives/${timestamp}`);
      
      // Move file to archive
      await this.persistenceHelper.archive(filePath, archivePath);
    } catch (error) {
      if (error instanceof Error) {
        // File doesn't exist, nothing to reset
        return {
          success: false,
          error: `Failed to reset file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      'insufficient_content', 'Content cannot be empty', 'error'],
      correctionGuidance:
      [
          '1. Add meaningful content to your file',
          '2. Include relevant information for your use case',
          '3. Ensure content is not just whitespace'
        ]
      }
    };
    return { isValid: true };
  }
}