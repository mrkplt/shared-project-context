import * as path from 'path';
import { FileSystemHelper } from './utilities/fileSystem';

interface CreateProjectArgs {
    projectPath: string;
}

class CreateProjectHandler {
  constructor(
    private contextRoot: string,
    private fsHelper: FileSystemHelper = new FileSystemHelper()
  ) {}

  async initProject(args: CreateProjectArgs): Promise<string> {
    const projectId = path.basename(args.projectPath);
    const contextPath = path.join(this.contextRoot, 'projects', projectId);

    try {
      await this.fsHelper.ensureDirectoryExists(contextPath);
      return projectId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize project: ${errorMessage}`);
    }
  }
}

export default CreateProjectHandler;