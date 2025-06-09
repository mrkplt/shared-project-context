import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';
import fs from 'fs/promises';
import { PersistenceHelper } from '../../../types.js';
import { PersistenceResponse } from '../../../types.js';

export class FileSystemHelper implements PersistenceHelper {
  contextRoot: string;
  
  constructor(
    contextRoot: string = path.join(os.homedir(), '.shared-project-context')
  ) {
    this.contextRoot = contextRoot;
  }

  async initProject(projectName: string): Promise<PersistenceResponse> {
    try {
      await this.ensureDirectoryExists(
        await this.getProjectPath(projectName)
      );
      return {success: true};
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async listProjects(): Promise< PersistenceResponse > {
    try {
      await this.ensureDirectoryExists( this.contextRoot );
      const entries = await this.readDirectory( this.contextRoot, { withFileTypes: true }) as Dirent[];
      return { success: true, data: entries.filter(entry => entry.isDirectory()).map(entry => entry.name) };
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async listAllContextForProject(projectName: string): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    try {
      const entries = await this.readDirectory(projectPath, { withFileTypes: true, recursive: true }) as Dirent[];
      return { success: true, data: await this.onlyContextNamesFromDirectory(entries) }
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async getContext(projectName: string, contextType: string, contextName: string[]): Promise<PersistenceResponse> {
    //TODO: handle multiple context names
    try {
      const filePath = await this.getContextFilePath(projectName, contextType, contextName[0]);
      return { success: true, data: [await fs.readFile(filePath, 'utf-8')]}
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async writeContext(projectName: string, contextType: string, fileName: string, content: string): Promise<PersistenceResponse> {
    try {
      const projectPath = await this.getProjectPath(projectName);
      const contextTypeDir = path.join(projectPath, contextType);
      await this.ensureDirectoryExists(contextTypeDir);

      const filePath = path.join(contextTypeDir, fileName);
      await fs.writeFile(filePath, content);

      return { success: true };

    } catch (error) {
      return {success: false, errors: [`Failed to write context: ${error instanceof Error ? error.message : 'Unknown error'}`]};
    }
  }


  async archiveContext(projectName: string, contextType: string, contextName: string[]): Promise<PersistenceResponse> {
      // TODO:This needs to be built
    //TODO: handle multiple context names
    return {success: false};
  }

  private async readDirectory(dirPath: string, options: { withFileTypes: boolean, recursive?: boolean } = { withFileTypes: true }): Promise<string[] | Dirent[]> {
    try {
      const entries = await fs.readdir(dirPath, { ...options, withFileTypes: true });
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
      await fs.access(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(directory, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  private async getProjectPath(projectName: string): Promise<string> {
    return path.join(this.contextRoot, 'projects', projectName);
  }

  private async getContextFilePath(projectName: string, contextType: string, name?: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectName)
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
  }

  private async onlyContextNamesFromDirectory(entries: Dirent[]): Promise<string[]> {
    return entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name.split('.')[0])
      .map(name => name.split('/')[-1])
      .filter(name => name !== '')
      
  }
}
