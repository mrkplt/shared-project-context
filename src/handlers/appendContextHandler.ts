import * as path from 'path';
import  { ContextTypeFactory } from './context_types/contexTypeFactory';
import { FileSystemHelper } from './utilities/fileSystem';

interface AppendContextArgs {
  projectId: string;
  fileType: string;
  content: string;
}

interface ContentItem {
  type: string;
  text: string;
}

class AppendContextHandler {
  constructor(
    private getContextFilePath: (projectId: string, fileType: string) => Promise<string>,
    private createProject: (projectPath: string) => Promise<string>
  ) {}

  async handle(args: AppendContextArgs): Promise<{ content: ContentItem[] }> {
    const contextType = ContextTypeFactory({
      projectName: args.projectId,
      persistenceHelper: new FileSystemHelper(),
      contextType: args.fileType
    });

    try {
      const filePath = await this.getContextFilePath(args.projectId, args.fileType);
      
      // Ensure project directory exists
      const projectDir = path.dirname(filePath);
      await this.createProject(projectDir);
      
      // Simply append with consistent spacing
      const contentToAppend = '\n\n' + args.content;
      await contextType.persistenceHelper.appendFile(filePath, contentToAppend);
      
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