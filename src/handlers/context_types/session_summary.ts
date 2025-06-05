import { ValidationResponse, ContextType, PersistenceResponse, ReadResponse } from '../../types.js';
import { Dirent } from 'fs';
import { FileSystemHelper } from '../utilities/fileSystem.js';

export class SessionSummaryType implements ContextType {
  private readonly directoryName = 'session_summary';
  private readonly archiveBasePath = 'archives/session_summary';
  persistenceHelper: FileSystemHelper;

  constructor(
    private projectName: string,
    persistenceHelper: FileSystemHelper, // Your existing FileSystemHelper,
  ) {
    this.persistenceHelper = persistenceHelper;
  }

  private getSessionSummaryDir(): string {
    return `${this.projectName}/${this.directoryName}`;
  }

  private generateTimestampedFileName(): string {
    // ISO string with millisecond precision, no timezone
    const now = new Date();
    const isoString = now.toISOString();
    // Remove timezone and colons from time
    return `${isoString.replace(/\.\d+Z$/, '').replace(/[:.]/g, '-')}.md`;
  }

  async update(_name: string | undefined, content: string): Promise<PersistenceResponse> {
    // Ensure session_summary directory exists
    const sessionSummaryDir = this.getSessionSummaryDir();
    
    try {
      await this.persistenceHelper.ensureDirectoryExists(sessionSummaryDir);
      
      // Generate timestamped filename
      const fileName = this.generateTimestampedFileName();
      const filePath = `${sessionSummaryDir}/${fileName}`;
      
      // Write the file
      await this.persistenceHelper.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write session summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async read(_name?: string): Promise<ReadResponse> {
    const sessionSummaryDir = this.getSessionSummaryDir();
    
    try {
      // Check if directory exists
      try {
        await this.persistenceHelper.getFileInfo(sessionSummaryDir);
      } catch (error) {
        // Directory doesn't exist, return empty content
        return { success: true, content: '' };
      }
      
      // List all files in the directory
      const files = await this.persistenceHelper.listDirectory(sessionSummaryDir);
      
      // Filter out directories and sort files by name (timestamp) in descending order
      const sortedFiles = files
        .filter((file: Dirent ) => !file.isDirectory)
        .sort((a: Dirent, b: Dirent) => b.name.localeCompare(a.name));
      
      // Read and concatenate all files
      let combinedContent = '';
      for (const file of sortedFiles) {
        try {
          const filePath = `${sessionSummaryDir}/${file.name}`;
          const content = await this.persistenceHelper.readFile(filePath);
          if (combinedContent) {
            combinedContent += '\n\n---\n\n'; // Add separator between entries
          }
          combinedContent += `# ${file.name.replace(/\.md$/, '')}\n\n${content}`;
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
          // Continue with next file even if one fails
        }
      }
      
      return { success: true, content: combinedContent };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to read session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async reset(_name?: string): Promise<PersistenceResponse> {
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
        error: `Failed to reset session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  validate(content: string): ValidationResponse {
    const trimmedContent = content.trim();
    
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
}