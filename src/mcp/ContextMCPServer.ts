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

  async handleGetContext(args: { project_id: string; file_type: string }) {
    const filePath = await this.projectManager.getContextFilePath(args.project_id, args.file_type);
    const content = await this.readFile(filePath);
    
    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }
  
  async handleUpdateContext(args: {
    project_id: string;
    file_type: string;
    content: string;
  }) {
    // First initialize the project if it doesn't exist
    const contextRoot = this.projectManager.getContextRoot();
    const projectDir = path.join(contextRoot, 'projects', args.project_id);
    
    await this.projectManager.initProject(projectDir);
    
    // Now get the file path
    const filePath = await this.projectManager.getContextFilePath(args.project_id, args.file_type);
    
    await this.writeFile(filePath, args.content);
    
    return {
      content: [{
        type: 'text',
        text: 'File updated successfully'
      }]
    };
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

    // Extract the project directory from the full file path
    const projectDir = path.dirname(filePath);
    
    try {
      await this.projectManager.initProject(projectDir);
      await this.fs.writeFile(filePath, content);
    } catch (error) {
      throw error;
    }
  }
}
