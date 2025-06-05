import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';

interface ReplaceContextArgs {
  project_id: string;
  file_type: string;
  content: string;
}

interface ContentItem {
  type: string;
  text: string;
}

class ReplaceContextHandler {
  constructor(
    private getContextFilePath: (projectId: string, fileType: string) => Promise<string>
  ) {}

  async handle(args: ReplaceContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      projectName: args.project_id,
      persistenceHelper: new FileSystemHelper(),
      contextType: args.file_type
    });
    try {
      // First initialize the project if it doesn't exist

      
      // Now get the file path and write the content
      const filePath = await this.getContextFilePath(args.project_id, args.file_type);
      await contextType.persistenceHelper.writeFile(filePath, args.content);
      
      return {
        content: [{
          type: 'text',
          text: 'File updated successfully'
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to replace context: ${errorMessage}`);
    }
  }
}

export default ReplaceContextHandler;