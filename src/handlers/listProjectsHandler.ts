import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

interface ContentItem {
  type: string;
  text: string;
}

class ListProjectsHandler {
  private persistenceHelper: FileSystemHelper

  constructor(
    persistenceHelper: FileSystemHelper
  ) {
    this.persistenceHelper = persistenceHelper;
  }

  async handle(): Promise<{ content: ContentItem[] }> {
    const projects = await this.persistenceHelper.listProjects();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(projects)
      }]
    };
  }
}

export default ListProjectsHandler;
