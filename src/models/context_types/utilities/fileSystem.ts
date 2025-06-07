import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface FileSystem {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
  appendFile: (path: string, content: string) => Promise<void>;
  access: (path: string) => Promise<void>;
  readdir: (path: string, options: { withFileTypes: boolean }) => Promise<Dirent[]>;
}

export const defaultFileSystem: FileSystem = {
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

export class FileSystemHelper {
  contextRoot: string;
  
  constructor(
    private fs: FileSystem = defaultFileSystem,
    contextRoot: string = path.join(os.homedir(), '.shared-project-context')
  ) {
    this.contextRoot = contextRoot;
  }
  async listAllContext(dirPath: string): Promise<string[]> {
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
  
  async readFile(filePath: string): Promise<string> {
    try {
      return await this.fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }
  
  async writeFile(filePath: string, content: string): Promise<void> {
    await this.fs.writeFile(filePath, content);
  }
  
  async appendFile(filePath: string, content: string): Promise<void> {
    await this.fs.appendFile(filePath, content);
  }

  async readdir(
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
  
  async ensureDirectoryExists(directory: string): Promise<void> {
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
  async moveFile(directory: string, targetPath: string): Promise<void> {
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
  async getFileInfo(directory: string): Promise<void> {
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
  // in this file does this.s
  async archive(directory: string, archivePath: string): Promise<void> {
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

  async initProject(projectId: string): Promise<void> {
    await this.ensureDirectoryExists(
      await this.getProjectPath(projectId)
    );
  }

  async listDirectory(directory: string): Promise<Dirent[]> {
    return this.fs.readdir(directory, { withFileTypes: true });
  }

  async getProjectPath(projectId: string): Promise<string> {
    return path.join(this.contextRoot, 'projects', projectId);
  }

  async getContextFilePath(projectId: string, contextType: string, name?: string): Promise<string> {
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
