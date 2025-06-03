import * as path from 'path';
import { FileSystemHelper } from '../core/filesystem';

interface AppendContextArgs {
  project_id: string;
  file_type: string;
  content: string;
}

interface ContentItem {
  type: string;
  text: string;
}

class AppendContextHandler {
  constructor(
    private getContextFilePath: (projectId: string, fileType: string) => Promise<string>,
    private fsHelper: FileSystemHelper = new FileSystemHelper(),
    private createProject: (projectPath: string) => Promise<string>
  ) {}

  async handle(args: AppendContextArgs): Promise<{ content: ContentItem[] }> {
    try {
      const filePath = await this.getContextFilePath(args.project_id, args.file_type);
      
      // Ensure project directory exists
      const projectDir = path.dirname(filePath);
      await this.createProject(projectDir);
      
      // Simply append with consistent spacing
      const contentToAppend = '\n\n' + args.content;
      await this.fsHelper.appendFile(filePath, contentToAppend);
      
      return {
        content: [{
          type: 'text',
          text: 'Content appended successfully'
        }]
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to append context: ${errorMessage}`);
    }
  }
}

export default AppendContextHandler;