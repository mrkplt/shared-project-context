import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PersistenceHelper } from '../../../types.js';

 const defaultFileSystem = {
  readFile: async (p: string, encoding: BufferEncoding) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.readFile(p, encoding);
    }
    const fs = await import('fs/promises');
    return fs.readFile(p, encoding);
  },
  
  writeFile: async (p: string, content: string) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.writeFile(p, content, 'utf-8');
    }
    const fs = await import('fs/promises');
    return fs.writeFile(p, content, 'utf-8');
  },
  
  appendFile: async (p: string, content: string) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.appendFile(p, content, 'utf-8');
    }
    const fs = await import('fs/promises');
    return fs.appendFile(p, content, 'utf-8');
  },
  
  mkdir: async (p: string, options: { recursive: boolean }) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.mkdir(p, options);
    }
    const fs = await import('fs/promises');
    return fs.mkdir(p, options);
  },
  
  access: async (p: string) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.access(p);
    }
    const fs = await import('fs/promises');
    return fs.access(p);
  },
  
  readdir: async (p: string, options: { withFileTypes: boolean }) => {
    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs/promises');
      return fs.readdir(p, { ...options, withFileTypes: true });
    }
    const fs = await import('fs/promises');
    return fs.readdir(p, { ...options, withFileTypes: true });
  }
};

export class FileSystemHelper implements PersistenceHelper {
  contextRoot: string;
  
  constructor(
    private fs = defaultFileSystem,
    contextRoot: string = path.join(os.homedir(), '.shared-project-context')
  ) {
    this.contextRoot = contextRoot;
  }

  async initProject(projectId: string): Promise<{success: boolean}> {
    await this.ensureDirectoryExists(
      await this.getProjectPath(projectId)
    );

    return {success: true};
  }

  async listAllContextForProject(projectId: string): Promise<string[]> {
    const projectPath = await this.getProjectPath(projectId);

    try {
      const entries = await this.readdir(projectPath, { withFileTypes: true }) as Dirent[];
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Can not read directory: ${errorMessage}`);
    }
  }

  async listProjects(): Promise< string[] > {
    try {
      await this.ensureDirectoryExists( this.contextRoot );
      const entries = await this.readdir( this.contextRoot, { withFileTypes: true }) as Dirent[];
      
      return  entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Can not read projects directory: ${errorMessage}`);
    }
  }

  async listAllContextTypes(projectId: string): Promise<string[]> {
    const dirPath = await this.getProjectPath(projectId);
    try {
      const entries = await this.readdir(dirPath, { withFileTypes: true }) as Dirent[];
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Can not read directory: ${errorMessage}`);
    }
  }
  
  async getContext(projectId: string, contextName: string): Promise<string> {
    try {
      const filePath = await this.getContextFilePath(projectId, contextName);
      return await this.fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  async writeContent(projectId: string, fileName: string, content: string): Promise<{success: boolean}> {
    const filePath = await this.getContextFilePath(projectId, fileName);
    await this.fs.writeFile(filePath, content);

    return {success: true};
  }

  // This needs to be built
  async archiveContext(projectName: string, contextType: string, contextName?: string): Promise<{success: boolean}> {
     // Archive the file first
     const timestamp = new Date().toISOString().split('T')[0];
     const projectPath = await this.getProjectPath(projectName);
     const archivePath = `${projectPath}/archives/${timestamp}/${contextType}`;
     
     // Ensure archive directory exists
     await this.ensureDirectoryExists(`${archivePath}`);
     
     // Move file to archive
     await this.moveFile(`${projectPath}/${contextType}`, `${archivePath}/${contextType}`);
    return {success: false};
  }

  private async readdir(
    dirPath: string, 
    options: { withFileTypes: boolean } = { withFileTypes: false }
  ): Promise<string[] | Dirent[]> {
    try {
      const entries = await this.fs.readdir(dirPath, options);
      return options.withFileTypes 
        ? entries as Dirent[] 
        : entries as unknown as string[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Directory not found');
      }
      throw error;
    }
  }
  
  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await this.fs.access(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.fs.mkdir(directory, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  //this is bullshit. its just a copy and paste of ensureDirectoryExists. 
  // I made these just to satisfy interface. I need to see if anything else
  // in this file does this.
  private async moveFile(directory: string, targetPath: string): Promise<void> {
    try {
      await this.fs.access(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.fs.mkdir(directory, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  //this is bullshit. its just a copy and paste of ensureDirectoryExists. 
  // I made these just to satisfy interface. I need to see if anything else
  // in this file does this.
  private async getFileInfo(directory: string): Promise<void> {
    try {
      await this.fs.access(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.fs.mkdir(directory, { recursive: true });
      } else {
        throw error;
      }
    }
  }
  
  private async appendFile(filePath: string, content: string): Promise<void> {
    await this.fs.appendFile(filePath, content);
  }

  private async listDirectory(directory: string): Promise<Dirent[]> {
    return this.fs.readdir(directory, { withFileTypes: true });
  }

  private async getProjectPath(projectId: string): Promise<string> {
    return path.join(this.contextRoot, 'projects', projectId);
  }

  private async getContextFilePath(projectId: string, contextType: string, name?: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectId)
    await this.ensureDirectoryExists(projectPath);

    switch (contextType) {
      case 'session_summary':
        return path.join(projectPath, contextType, `${name}.md`);
      case 'other':
        return path.join(projectPath, contextType, `${name}.md`);
      case 'mental_model':
        return path.join(projectPath, `${contextType}.md`);
      case 'features':
        return path.join(projectPath, `${contextType}.md`);
      default:
        throw new Error('Invalid file type');
    }
  };
}
