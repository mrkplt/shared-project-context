import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import  ContextTypeFactory  from '../models/contexTypeFactory';
import { ContentItem } from '../types';

interface GetContextArgs {
  projectId: string;
  contextType: string;
  fileName?: string;
}

class GetContextHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: GetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      projectName: args.projectId,
      persistenceHelper: this.fsHelper,
      contextType: args.contextType,
      fileName: args.fileName || args.contextType
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