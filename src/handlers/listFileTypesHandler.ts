import * as path from 'path';
import { FileSystemHelper } from './utilities/fileSystem';

interface ListFileTypesArgs {
  project_id: string;
}

interface ContentItem {
  type: string;
  text: string;
}

class ListFileTypesHandler {
  constructor(
    private contextRoot: string,
    private fsHelper: FileSystemHelper = new FileSystemHelper()
  ) {}

  async handle(args: ListFileTypesArgs): Promise<{ content: ContentItem[] }> {
    const projectDir = path.join(this.contextRoot, 'projects', args.project_id);
    
    try {
      // Ensure project directory exists
      await this.fsHelper.ensureDirectoryExists(projectDir);
      
      // Read directory contents with file types
      const entries = await this.fsHelper.readdir(projectDir, { withFileTypes: true }) as import('fs').Dirent[];
      
      // Filter for files, ignore system files, and extract file types (extensions removed)
      const fileTypes = entries
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
          text: JSON.stringify(fileTypes)
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

export default ListFileTypesHandler;