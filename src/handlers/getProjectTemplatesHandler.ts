import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';

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
      const response = await this.fsHelper.getProjectConfig(args.projectName);
      if (!response.success || !response.config) {
        return { content: [
          { type: 'text', text: `GetProjectTemplatesHandler: Failed to load project configuration.` },
          { type: 'text', text: response.errors?.join(', ') || 'Unknown error' },
        ] };
      }
      const contextTypes = response
        .config
        .contextTypes
        .filter(type => type.template)
        .map(ct => ct.name);

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