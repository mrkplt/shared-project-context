import { ContentItem } from '../types';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

class CreateProjectHandler {
  private persistenceHelper: FileSystemHelper;
  
  constructor(
    persistenceHelper: FileSystemHelper,
  ) {
    this.persistenceHelper = persistenceHelper;
    }

  async handle(args: {projectName: string}): Promise<{ content: ContentItem[] }> {
    try {
      await this.persistenceHelper.initProject(args.projectName);
      return {
        content: [{
          type: 'text',
          text: 'Project initialized successfully'
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize project: ${errorMessage}`);
    }
  }
}

export default CreateProjectHandler;