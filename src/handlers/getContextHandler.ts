import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';
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
      const filePath = await this.fsHelper.getContextFilePath(args.projectId, args.contextType);
      const content = await contextType.persistenceHelper.readFile(filePath);
      
      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get context: ${errorMessage}`);
    }
  }
}

export default GetContextHandler;