import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';

interface GetContextArgs {
  project_id: string;
  file_type: string;
}

interface ContentItem {
  type: string;
  text: string;
}

class GetContextHandler {
  constructor(
    private getContextFilePath: (projectId: string, fileType: string) => Promise<string>,
    private fsHelper: FileSystemHelper = new FileSystemHelper()
  ) {}

  async handle(args: GetContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      projectName: args.project_id,
      persistenceHelper: this.fsHelper,
      contextType: args.file_type
    });
    try {
      const filePath = await this.getContextFilePath(args.project_id, args.file_type);
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