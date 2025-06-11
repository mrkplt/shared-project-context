import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import  ContextTypeFactory from '../models/contexTypeFactory';
import { ContentItem } from '../types';

interface ResetContextArgs {
  projectName: string;
  contextType: string;
  contextName?: string; // For 'other' type files
}

class ResetContextHandler {
  private fsHelper: FileSystemHelper;

  constructor(
    fsHelper: FileSystemHelper 
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: ResetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      persistenceHelper: this.fsHelper,
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