import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import  ContextTypeFactory  from '../models/contexTypeFactory.js';
import { ContentItem } from '../types.js';

interface GetContextArgs {
  projectName: string;
  contextType: string;
  contextName?: string;
}

class GetContextHandler {
  private persistenceHelper: FileSystemHelper;
  
  constructor(
    persistenceHelper: FileSystemHelper
  ) {
    this.persistenceHelper = persistenceHelper;
  }

  async handle(args: GetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = await ContextTypeFactory({
      projectName: args.projectName,
      persistenceHelper: this.persistenceHelper,
      contextType: args.contextType,
      contextName: args.contextName
    });

    try {
      const result = await contextType.read();
      
      if (result.success) {
       return {
        content: [{
          type: 'text',
          text: result.content || ''
        }]
      };
    };

    return {
      content: [{
        type: 'text',
        text: result.errors?.join('\n') || 'An unknown error occurred'
      }]
    };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get context: ${errorMessage}`);
    }
  }
}

export default GetContextHandler;