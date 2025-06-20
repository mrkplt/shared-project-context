import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import  ContextTypeFactory from '../models/contexTypeFactory';
import { ContentItem } from '../types';

interface ResetContextArgs {
  projectName: string;
  contextType: string;
  contextName?: string;
}

class ResetContextHandler {
  private persistenceHelper: FileSystemHelper;

  constructor(
    persistenceHelper: FileSystemHelper 
  ) {
    this.persistenceHelper = persistenceHelper;
  }

  async handle(args: ResetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = await ContextTypeFactory({
      persistenceHelper: this.persistenceHelper,
      projectName: args.projectName,
      contextType: args.contextType,
      contextName: args.contextName
    });

    const result = await contextType.reset()
  
    if (result.success) {  
      return {
        content: [{
          type: 'text',
          text: 'Context reset successfully'
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: result.errors?.join('\n') || 'An unknown error occurred'
      }]
    };
  }
}

export default ResetContextHandler;