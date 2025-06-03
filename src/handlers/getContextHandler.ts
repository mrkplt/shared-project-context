import { FileSystemHelper } from '../core/filesystem';

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
    try {
      const filePath = await this.getContextFilePath(args.project_id, args.file_type);
      const content = await this.fsHelper.readFile(filePath);
      
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