import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import  ContextTypeFactory from '../models/contexTypeFactory';
import { ContentItem } from '../types';

interface UpdateContextArgs {
  projectName: string;
  contextType: string;
  content: string;
  contextName?: string; // For 'other' type files
}

class UpdateContextHandler {
  private fsHelper: FileSystemHelper;

  constructor(
    fsHelper: FileSystemHelper 
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: UpdateContextArgs): Promise<{ content: ContentItem[] }> {
    if (args.contextType === 'other' && !args.contextName) throw new Error('File name is required for type "other"');

    const contextType = ContextTypeFactory({
      projectName: args.projectName,
      persistenceHelper: this.fsHelper,
      contextType: args.contextType,
      fileName: args.contextName || args.contextType
    });

    const result = await contextType.update(args.content)
  
    if (result.success) {  
      return {
        content: [{
          type: 'text',
          text: 'Context updated successfully'
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

export default UpdateContextHandler;