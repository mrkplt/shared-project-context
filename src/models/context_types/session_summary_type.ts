import { ValidationResponse, ContextType, ContexTypeResponse, ContextTypeArgs } from '../../types.js';

import { FileSystemHelper } from './utilities/fileSystem.js';

export class SessionSummaryType implements ContextType {
  private static readonly DEFAULT_FILE_NAME = 'session_summary'
  private readonly archiveBasePath = 'archives/session_summary';
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly contextName: string;
  private content: string | undefined;

  constructor(args: ContextTypeArgs) {
    this.persistenceHelper = args.persistenceHelper;
    this.projectName = args.projectName;
    this.contextName = SessionSummaryType.DEFAULT_FILE_NAME || args.contextName;  // Disregard fileName if provided
    this.content = args.content;
  }

  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: ['Content is required to update session summary']
      };
    }

    const result = await this.persistenceHelper.writeContext(
      this.projectName, 
      'session_summary', 
      this.generateTimestampedContextName(), 
      this.content
    );
     
    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }

    return { success: true };
  }
  
  async read(): Promise<ContexTypeResponse> {
    try {
      // List all context files for the project
      const result = await this.persistenceHelper.listAllContextForProject(this.projectName);
      
      if (!result.success) {
        return {
          success: false,
          errors: result.errors
        };
      }
      
      if (!result.data) {
        return {
          success: false,
          errors: ['No session summary files found']
        };
      }
      
      const sessionSummaryFiles = result.data
        .filter((fileName: string) => fileName.startsWith('session_summary/'))
        .map((fileName: string) => fileName.replace('session_summary/', ''))
        .sort().reverse() || [];
      
      // Read and concatenate all files
      let combinedContent = '';
      for (const fileName of sessionSummaryFiles) {
        try {
          const fileResult = await this.persistenceHelper.getContext(
            this.projectName,
            'session_summary',
            fileName.replace(/\.md$/, '') // Remove .md extension for context name
          );
          
          if (fileResult.success && fileResult.data?.length > 0) {
            if (combinedContent) {
              combinedContent += '\n\n---\n\n'; // Add separator between entries
            }
            combinedContent += `# ${fileName.replace(/\.md$/, '')}\n\n${fileResult.data[0]}`;
          }
        } catch (error) {
          console.error(`Error reading file ${fileName}:`, error);
          // Continue with next file even if one fails
        }
      }
      
      return { success: true, content: combinedContent };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to read session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async reset(_name?: string): Promise<ContexTypeResponse> {
    const sessionSummaryDir = this.getSessionSummaryDir();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const archivePath = `${this.projectName}/${this.archiveBasePath}/${timestamp}`;
    
    try {
      // Check if there are any files to archive
      try {
        const files = await this.persistenceHelper.listDirectory(sessionSummaryDir);
        if (files.length === 0) {
          return { success: true }; // Nothing to archive
        }
      } catch (error) {
        // Directory doesn't exist, nothing to archive
        return { success: true };
      }
      
      // Create archive directory
      await this.persistenceHelper.ensureDirectoryExists(archivePath);
      
      // List all files in the directory
      const files = await this.persistenceHelper.listDirectory(sessionSummaryDir);
      
      // Move each file to the archive
      for (const file of files) {
        if (!file.isDirectory) {
          const sourcePath = `${sessionSummaryDir}/${file.name}`;
          const targetPath = `${archivePath}/${file.name}`;
          await this.persistenceHelper.moveFile(sourcePath, targetPath);
        }
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to reset session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  validate(): ValidationResponse {
    const trimmedContent = this.content?.trim() || '';
    
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 
          'Session summary cannot be empty', 
          'error'
        ],
        correctionGuidance: [
          '1. Add a summary of the session',
          '2. Include key decisions, changes, and next steps',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }

  private generateTimestampedContextName(): string {
    // ISO string with millisecond precision, no timezone
    const now = new Date();
    const isoString = now.toISOString();
    // Remove timezone and colons from time
    return `${this.contextName}-${isoString.replace(/\.\d+Z$/, '').replace(/[:.]/g, '-')}`;
  }
}