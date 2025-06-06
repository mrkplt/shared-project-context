import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';
import { ContentItem } from '../types';

interface GetContextArgs {
  projectId: string;
  fileType: string;
  fileName?: string;
}

class GetContextHandler {
  constructor(
    private fsHelper: FileSystemHelper
  ) {}

  async handle(args: GetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      projectName: args.projectId,
      persistenceHelper: this.fsHelper,
      contextType: args.fileType,
      fileName: args.fileName || args.fileType
    });
    try {
      const filePath = await this.fsHelper.getContextFilePath(args.projectId, args.fileType);
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