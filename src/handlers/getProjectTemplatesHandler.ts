import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';
import { typeMap } from '../models/contexTypeFactory';

interface GetProjectTemplatesArgs {
  projectName: string;
}

class GetProjectTemplatesHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: GetProjectTemplatesArgs): Promise<{ content: ContentItem[] }> {
    try {
      // Get all context types excluding 'other' since it will never exist
      const contextTypes = Object.keys(typeMap).filter(type => type !== 'other');
      
      const templates: Record<string, string> = {};
      
      // Retrieve each template iteratively
      for (const contextType of contextTypes) {
        const result = await this.fsHelper.getTemplate(args.projectName, contextType);
        
        if (result.success && result.data && result.data.length > 0) {
          templates[contextType] = result.data[0];
        } else {
          return {
            content: [{
              type: 'text',
              text: `Something has gone wrong. Failed to retrieve template for ${contextType}.`
            }]
          };
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(templates)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get project templates: ${errorMessage}`);
    }
  }
}

export default GetProjectTemplatesHandler;