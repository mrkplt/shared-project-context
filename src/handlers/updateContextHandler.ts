import { FileSystemHelper } from './utilities/fileSystem';
import { ContextTypeFactory } from './context_types/contexTypeFactory';
import { ContentItem } from '../types';

interface UpdateContextArgs {
  projectId: string;
  fileType: string;
  content: string;
  name?: string; // For 'other' type files
}

class UpdateContextHandler {
  constructor(
    private fsHelper: FileSystemHelper 
  ) {}

  async handle(args: UpdateContextArgs): Promise<{ content: ContentItem[] }> {
    if (args.fileType === 'other' && !args.name) {
      throw new Error('File name is required for type "other"');
    }

    const contextType = ContextTypeFactory({
      projectName: args.projectId,
      persistenceHelper: this.fsHelper,
      contextType: args.fileType
    });

    try {
      const filePath = await this.fsHelper.getContextFilePath(args.projectId, args.fileType, args.name);

      // Determine write behavior based on file type
      if (args.fileType === 'session_summary') {
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