import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';

interface ListContextsArgs {
  projectName: string;
}

class ListContextsHandler {
  private persistenceHelper: FileSystemHelper;
  
  constructor(persistenceHelper: FileSystemHelper) {
    this.persistenceHelper = persistenceHelper;
  }

  async handle(args: ListContextsArgs): Promise<{ content: ContentItem[] }> {
    try {
      // Get project configuration
      const response = await this.persistenceHelper.getProjectConfig(args.projectName);
      if (!response.success || !response.config) {
        return { content: [
          { type: 'text', text: 'ListContextsHandler: Failed to load project configuration.' },
          { type: 'text', text: response.errors?.join(', ') || 'Unknown error' },
        ] };
      }

      const { config } = response;
      const output = {} as Record<string, { description: string; contexts: string[] }>;
      
      // Process each context type
      for (const typeConfig of config.contextTypes) {        
        try {
          // Get context names for this type
          const contextNamesResponse = await this.persistenceHelper.listAllContextForType(
            args.projectName, 
            typeConfig.name
          );

          if (!contextNamesResponse.success || !contextNamesResponse.data) {
            return {
              content: [
                { type: 'text', text: 'ListContextsHandler: Failed to list contexts.' },
                { type: 'text', text: contextNamesResponse.errors?.join(', ') || 'Unknown error' },
              ]
            };
          }
          
          output[typeConfig.name] = {
            description: typeConfig.description,
            contexts: contextNamesResponse.data
          };
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [
              { type: 'text', text: 'ListContextsHandler: Failed to list contexts.' },
              { type: 'text', text: errorMessage },
            ]
          };
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(output)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list context types: ${errorMessage}`);
    }
  }
}

export default ListContextsHandler;