import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem, BaseTypeConfig } from '../types';

interface ListContextsArgs {
  projectName: string;
}

class ListContextsHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: ListContextsArgs): Promise<{ content: ContentItem[] }> {
    try {
      // Get project configuration
      const config = await this.fsHelper.getProjectConfig(args.projectName);
      
      // Get existing files for each context type
      const allFiles = await this.fsHelper.listAllContextForProject(args.projectName);
      
      let output = `# Available Context Types for This Project\n\n`;
      
      for (const typeConfig of config.contextTypes) {
        output += `## ${typeConfig.name}\n`;
        output += `${typeConfig.description}\n`;
        
        // Find existing files for this context type
        const files = this.getFilesForContextType(typeConfig, allFiles.data || []);
        
        if (files.length > 0) {
          output += `\nExisting files: ${files.join(', ')}\n`;
        }
        
        output += `\n`;
      }
      
      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list context types: ${errorMessage}`);
    }
  }

  // TODO move back to file system with aget contexts for type method
  private getFilesForContextType(typeConfig: BaseTypeConfig, allFiles: string[]): string[] {
    if (typeConfig.name === 'other') {
      // Return all files that aren't core types
      return allFiles.filter(f => !['session_summary', 'mental_model', 'features'].some(ct => f.startsWith(ct)));
    } else {
      // Return files that match this context type
      return allFiles.filter(f => f.startsWith(typeConfig.name));
    }
  }
}

export default ListContextsHandler;