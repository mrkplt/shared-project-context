import * as os from 'os';
import * as path from 'path';
import { ContentItem } from '../types';
import { FileSystemHelper } from './utilities/fileSystem';

interface CreateProjectArgs {
    projectId: string;
}

class CreateProjectHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
    private contextRoot: string = path.join(os.homedir(), '.shared-project-context'),

  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: CreateProjectArgs): Promise<{ content: ContentItem[] }> {
    const projectId = path.basename(args.projectId);
    const contextPath = path.join(this.contextRoot, 'projects', projectId);

    try {
      await this.fsHelper.ensureDirectoryExists(contextPath);
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