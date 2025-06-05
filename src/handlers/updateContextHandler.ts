import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';
import * as path from 'path';

interface UpdateContextArgs {
  project_id: string;
  file_type: string;
  content: string;
  name?: string; // For 'other' type files
}

interface ContentItem {
  type: string;
  text: string;
}

class UpdateContextHandler {
  constructor(
    private getContextFilePath: (projectId: string, fileType: string, name?: string) => Promise<string>,
    private createProject: (projectPath: string) => Promise<void> = async () => {}
  ) {}

  async handle(args: UpdateContextArgs): Promise<{ content: ContentItem[] }> {
    // Validate file_type for 'other' requires a name
    if (args.file_type === 'other' && !args.name) {
      throw new Error('File name is required for type "other"');
    }

    const contextType = ContextTypeFactory({
      projectName: args.project_id,
      persistenceHelper: new FileSystemHelper(),
      contextType: args.file_type
    });

    try {
      const filePath = await this.getContextFilePath(args.project_id, args.file_type, args.name);
      const projectDir = path.dirname(filePath);
      
      // Ensure project directory exists
      await this.createProject(projectDir);

      // Determine write behavior based on file type
      if (args.file_type === 'session_summary') {
        // For session_summary, append with timestamp
        const timestampedContent = `\n\n## ${new Date().toISOString()}\n${args.content}`;
        await contextType.persistenceHelper.appendFile(filePath, timestampedContent);
      } else {
        // For other types, replace the entire content
        await contextType.persistenceHelper.writeFile(filePath, args.content);
      }

      return {
        content: [{
          type: 'text',
          text: 'Context updated successfully'
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update context: ${errorMessage}`);
    }
  }
}

export default UpdateContextHandler;