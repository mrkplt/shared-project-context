import * as os from 'os';
import * as path from 'path';
import { FileSystemHelper } from './utilities/fileSystem';
import { Dirent } from 'fs';
import { ContentItem } from '../types';

class ListProjectsHandler {
  private contextRoot: string;
  private fsHelper: FileSystemHelper;

  constructor(
    fsHelper: FileSystemHelper,
    contextRoot: string = path.join(os.homedir(), '.shared-project-context'),
    
  ) {
    this.contextRoot = contextRoot;
    this.fsHelper = fsHelper;
  }

  async handle(): Promise<{ content: ContentItem[] }> {
    const projectsDir = path.join(this.contextRoot, 'projects');

    try {
      await this.fsHelper.ensureDirectoryExists(projectsDir);
      
      const entries = await this.fsHelper.readdir(projectsDir, { withFileTypes: true }) as Dirent[];
      const projectNames = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(projectNames)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
        throw new Error('Insufficient permissions to read projects directory');
      }
      
      // For any other error, including ENOENT (handled by ensureDirectoryExists), return empty array
      return {
        content: [{
          type: 'text',
          text: JSON.stringify([])
        }]
      };
    }
  }
}

export default ListProjectsHandler;
