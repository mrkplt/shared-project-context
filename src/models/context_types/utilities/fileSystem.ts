import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';
import fs from 'fs/promises';
import { PersistenceHelper } from '../../../types.js';
import { PersistenceResponse } from '../../../types.js';
import { typeMap } from '../../contexTypeFactory';

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
      await this.ensureDirectoryExists(this.contextRoot);
      const entries = await this.readDirectory( path.join(this.contextRoot, 'projects'), { withFileTypes: true }) as Dirent[];
      return { success: true, data: entries.filter(entry => entry.isDirectory()).map(entry => entry.name) };
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async listAllContextForProject(projectName: string): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    Object.keys(typeMap).forEach(async key => {
      await this.ensureDirectoryExists(path.join(projectPath, key));
    });
    
    try {
      const entries = await this.readDirectory(projectPath, { withFileTypes: true, recursive: true }) as Dirent[];
      return { success: true, data: await this.onlyContextNamesFromDirectory(entries) }
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async getContext(projectName: string, contextType: string, contextNames: string[]): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, contextType));

    try {
      const filePathPromises = contextNames.map(name => 
        this.getContextFilePath(projectName, contextType, name)
      );
      const filePaths = await Promise.all(filePathPromises);
      
      // Read all files concurrently
      const fileReadPromises = filePaths.map(async (filePath, index) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { content, error: null, name: contextNames[index] };
        } catch (error) {
          if (
            error instanceof Error 
            && (error as NodeJS.ErrnoException).code === 'ENOENT' 
            && ['session_summary', 'features', 'mental_model'].includes(contextType)
          ) {
            return { content: '', error: null, name: contextNames[index] };
          } else if (
            error instanceof Error 
            && (error as NodeJS.ErrnoException).code === 'ENOENT' 
            && ['other'].includes(contextType) 
          ) {
            return { content: null, error: 'Context not found. Have you created it using create_context yet?', name: contextNames[index] };
          }
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { content: null, error: errorMessage, name: contextNames[index] };
        }
      });
      
      const results = await Promise.all(fileReadPromises);
      
      // Check if any reads failed
      const errors = results
        .filter(result => result.error !== null)
        .map(result => `${result.name}: ${result.error}`);
      
      // If any errors, return failure
      if (errors.length > 0) {
        return { success: false, errors };
      }
      
      // Sort results by name and extract content
      const sortedResults = results
        .filter(result => result.content !== null)
      
      const data = sortedResults.map(result => result.content!);
      
      return { success: true, data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  async writeContext(projectName: string, contextType: string, contextName: string, content: string): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName); 
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }
    
    await this.ensureDirectoryExists(path.join(projectPath, contextType));
    
    try {
      const fileName = contextType === 'session_summary' 
        ? this.generateTimestampedContextName(contextName) 
        : contextName;
     
      const filePath = await this.getContextFilePath(projectName, contextType, fileName);
      
      await fs.writeFile(filePath, content);

      return { success: true };

    } catch (error) {
      return {success: false, errors: [`Failed to write context: ${error instanceof Error ? error.message : 'Unknown error'}`]};
    }
  }


  async archiveContext(projectName: string, contextType: string, contextNames: string[]): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, 'archive', contextType));

    try {
      const projectPath = await this.getProjectPath(projectName);
      const timestamp = this.timestamp();
      const archiveDir = path.join(projectPath, 'archive', contextType, timestamp);
      
      // Ensure the archive directory exists
      await this.ensureDirectoryExists(archiveDir);
      
      // Process each context name
      const movePromises = contextNames.map(async (contextName) => {
        try {
          // Get the source file path
          const sourceFilePath = await this.getContextFilePath(projectName, contextType, contextName);
          
          if (!(await this.fileExists(sourceFilePath))) {
            return { success: true, name: contextName };
          }

          // Get the filename from the source path
          const fileName = path.basename(sourceFilePath);
          
          // Create destination path in archive directory
          const destinationPath = path.join(archiveDir, fileName);
          
          // Move the file to archive
          await fs.rename(sourceFilePath, destinationPath);
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, name: contextName, error: errorMessage };
        }
      });
      
      const results = await Promise.all(movePromises);
      
      // Check if any moves failed
      const errors = results
        .filter(result => !result.success)
        .map(result => `${result.name}: ${result.error}`);
      
      // If any errors, return failure
      if (errors.length > 0) {
        return { success: false, errors };
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
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

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private async getProjectPath(projectName: string): Promise<string> {
    return path.join(this.contextRoot, 'projects', projectName);
  }

  private async getContextFilePath(projectName: string, contextType: string, contextName?: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectName)
    await this.ensureDirectoryExists(path.join(projectPath, contextType));

    switch (contextType) {
      case 'session_summary':
        return path.join(projectPath, contextType, `${contextName}.md`);
      case 'other':
        return path.join(projectPath, contextType, `${contextName}.md`);
      case 'mental_model':
        return path.join(projectPath, contextType, `${contextType}.md`);
      case 'features':
        return path.join(projectPath, contextType, `${contextType}.md`);
      default:
        throw new Error('Invalid file type');
    }
  }

  private async onlyContextNamesFromDirectory(entries: Dirent[]): Promise<string[]> {
    return entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name.split('.')[0].split('/').pop())
      .filter((name): name is string => name !== undefined && name !== '');
  }

  private timestamp(): string {
    const now = new Date();
    const isoString = now.toISOString();
    return `${isoString.replace(/\.\d+Z$/, '').replace(/[:.]/g, '-')}`;
  }

  private generateTimestampedContextName(contextType: string): string {
    return `${contextType}-${this.timestamp()}`;
  }
}
