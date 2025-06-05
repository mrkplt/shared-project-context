import * as path from 'path';
import { FileSystemHelper } from './utilities/fileSystem';

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
    private contextRoot: string,
    private getContextFilePath: (projectId: string, fileType: string) => Promise<string>,
    private fsHelper: FileSystemHelper = new FileSystemHelper(),
    private createProject: (projectPath: string) => Promise<string>
  ) {}

  async handle(args: ReplaceContextArgs): Promise<{ content: ContentItem[] }> {
    try {
      // First initialize the project if it doesn't exist
      const projectDir = path.join(this.contextRoot, 'projects', args.project_id);
      await this.createProject(projectDir);
      
      // Now get the file path and write the content
      const filePath = await this.getContextFilePath(args.project_id, args.file_type);
      await this.fsHelper.writeFile(filePath, args.content);
      
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