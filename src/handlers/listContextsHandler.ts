import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';

interface ListContextsArgs {
  projectName: string;
}

class ListContextsHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(fsHelper: FileSystemHelper) {
    this.fsHelper = fsHelper;
  }

  async handle(args: ListContextsArgs): Promise<{ content: ContentItem[] }> {
    try {
      // Get project configuration
      const response = await this.fsHelper.getProjectConfig(args.projectName);
      if (!response.success || !response.config) {
        return { content: [
          { type: 'text', text: 'ListContextsHandler: Failed to load project configuration.' },
          { type: 'text', text: response.errors?.join(', ') || 'Unknown error' },
        ] };
      }

      const { config } = response;
      let output = '# Available Context Types for This Project\n\n';
      
      // Process each context type
      for (const typeConfig of config.contextTypes) {
        output += `## ${typeConfig.name}\n${typeConfig.description}\n`;
        
        try {
          // Get context names for this type
          const contextNamesResponse = await this.fsHelper.listAllContextForType(
            args.projectName, 
            typeConfig.name
          );

          if (!contextNamesResponse.success || !contextNamesResponse.data) {
            output += `\nError listing contexts: ${contextNamesResponse.errors?.join(', ')}\n\n`;
            continue;
          }
          
          if (contextNamesResponse.data.length > 0) {
            output += `\nExisting files: ${contextNamesResponse.data.join(', ')}\n`;
          }
          
          output += '\n';
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          output += `\nError listing contexts: ${errorMessage}\n\n`;
        }
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
}

export default ListContextsHandler;