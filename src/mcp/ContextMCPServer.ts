import * as path from 'path';
import { ProjectManager } from '../project/ProjectManager';

// Define file system interface for better testability
interface FileSystem {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
}

export class ContextMCPServer {
  private projectManager: ProjectManager;
  private fs: FileSystem;

  constructor(
    projectManager: ProjectManager, 
    fileSystem?: Partial<FileSystem>
  ) {
    this.projectManager = projectManager;
    
    // Use provided file system or default to Node's fs/promises
    this.fs = {
      readFile: fileSystem?.readFile || (async (p, enc) => {
        // For testing, we'll use the mocked version from jest
        if (process.env.NODE_ENV === 'test') {
          const fs = require('fs/promises');
          return fs.readFile(p, enc);
        }
        const fs = await import('fs/promises');
        return fs.readFile(p, enc);
      }),
      writeFile: fileSystem?.writeFile || (async (p, content) => {
        // For testing, we'll use the mocked version from jest
        if (process.env.NODE_ENV === 'test') {
          const fs = require('fs/promises');
          return fs.writeFile(p, content, 'utf-8');
        }
        const fs = await import('fs/promises');
        return fs.writeFile(p, content, 'utf-8');
      }),
      mkdir: fileSystem?.mkdir || (async (p: string, options: { recursive: boolean }) => {
        // For testing, we'll use the mocked version from jest
        if (process.env.NODE_ENV === 'test') {
          const fs = require('fs/promises');
          return fs.mkdir(p, options);
        }
        const fs = await import('fs/promises');
        return fs.mkdir(p, options);
      })
    };
  }

  // No need for explicit server setup as we're using the main server instance
  // from the ContextManagerServer class

  async handleGetContext(args: { project_id: string; file_type: string }): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      console.log(`[DEBUG] handleGetContext - project_id: ${args.project_id}, file_type: ${args.file_type}`);
      const filePath = await this.projectManager.getContextFilePath(args.project_id, args.file_type);
      console.log(`[DEBUG] Resolved file path: ${filePath}`);
      const content = await this.readFile(filePath);
      return { success: true, content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] handleGetContext failed:`, error);
      return { success: false, error: errorMessage };
    }
  }

  async handleUpdateContext(args: {
    project_id: string;
    file_type: string;
    content: string;
  }): Promise<{
    success: boolean;
    error?: string;
    validation?: {
      valid: boolean;
      errors: Array<{
        type: string;
        section?: string;
        message: string;
        severity: 'error' | 'warning';
        correction_prompt: string;
        template_example: string;
      }>;
    };
  }> {
    try {
      console.log(`[DEBUG] handleUpdateContext - project_id: ${args.project_id}, file_type: ${args.file_type}`);
      
      // First initialize the project if it doesn't exist
      const contextRoot = this.projectManager.getContextRoot();
      const projectDir = path.join(contextRoot, 'projects', args.project_id);
      
      console.log(`[DEBUG] Initializing project in directory: ${projectDir}`);
      await this.projectManager.initProject(projectDir);
      
      // Now get the file path
      const filePath = await this.projectManager.getContextFilePath(args.project_id, args.file_type);
      console.log(`[DEBUG] handleUpdateContext - filePath: ${filePath}`);
      
      await this.writeFile(filePath, args.content);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] handleUpdateContext failed:`, error);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      return await this.fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    console.log(`[DEBUG] writeFile called with path: ${filePath}`);
    // Extract the project directory from the full file path
    const projectDir = path.dirname(filePath);
    console.log(`[DEBUG] Project directory: ${projectDir}`);
    
    try {
      await this.projectManager.initProject(projectDir);
      console.log(`[DEBUG] Project initialized, writing to: ${filePath}`);
      await this.fs.writeFile(filePath, content);
      console.log(`[DEBUG] Successfully wrote to file: ${filePath}`);
    } catch (error) {
      console.error(`[ERROR] Failed to write file ${filePath}:`, error);
      throw error;
    }
  }
}
