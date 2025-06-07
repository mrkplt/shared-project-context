import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

interface ContentItem {
  type: string;
  text: string;
}

class ListProjectsHandler {
  private fsHelper: FileSystemHelper

  constructor(

    fsHelper: FileSystemHelper
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(): Promise<{ content: ContentItem[] }> {
    const projects = await this.fsHelper.listProjects();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(projects)
      }]
    };
  }
}

export default ListProjectsHandler;
