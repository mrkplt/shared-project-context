import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import  ContextTypeFactory from '../models/contexTypeFactory';
import { ContentItem } from '../types';

interface UpdateContextArgs {
  projectId: string;
  contextType: string;
  content: string;
  fileName?: string; // For 'other' type files
}

class UpdateContextHandler {
  private fsHelper: FileSystemHelper;

  constructor(
    fsHelper: FileSystemHelper 
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: UpdateContextArgs): Promise<{ content: ContentItem[] }> {
    if (args.contextType === 'other' && !args.fileName) {
      throw new Error('File name is required for type "other"');
    }

    const contextType = ContextTypeFactory({
      projectName: args.projectId,
      persistenceHelper: this.fsHelper,
      contextType: args.contextType,
      fileName: args.fileName || args.contextType
    });

    try {
      const filePath = await this.fsHelper.getContextFilePath(args.projectId, args.contextType, args.fileName);

      // Determine write behavior based on file type
      if (args.contextType === 'session_summary') {
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