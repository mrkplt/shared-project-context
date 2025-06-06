import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { Dirent } from 'fs';

interface ContentItem {
  type: string;
  text: string;
}

class ListProjectsHandler {
  private fsHelper: FileSystemHelper

  constructor(

    fsHelper: FileSystemHelper
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(): Promise<{ content: ContentItem[] }> {
    const projectsDir = this.fsHelper.contextRoot;

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
