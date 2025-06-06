import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';

interface ListcontextTypesArgs {
  project_name: string;
}

class ListcontextTypesHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: ListcontextTypesArgs): Promise<{ content: ContentItem[] }> {
    const projectDir = await this.fsHelper.getProjectPath(args.project_name);
    
    try {
      // Ensure project directory exists
      await this.fsHelper.ensureDirectoryExists(projectDir);
      
      // Read directory contents with file types
      const entries = await this.fsHelper.readdir(projectDir, { withFileTypes: true }) as import('fs').Dirent[];
      
      // Filter for files, ignore system files, and extract file types (extensions removed)
      const contextTypes = entries
        .filter((entry): entry is import('fs').Dirent & { name: string } => 
          entry.isFile() && 
          typeof entry.name === 'string' &&
          !entry.name.startsWith('.')
        )
        .map(entry => {
          const name = entry.name;
          // Remove .md extension if present, otherwise use full name
          return name.endsWith('.md') ? name.slice(0, -3) : name;
        })
        .sort(); // Sort alphabetically
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(contextTypes)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('no such file or directory') || 
          (error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify([])
          }]
        };
      } else if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
        throw new Error('Insufficient permissions to read project directory');
      }
      
      // Re-throw unexpected errors
      throw new Error(`Failed to list file types: ${errorMessage}`);
    }
  }
}

export default ListcontextTypesHandler;