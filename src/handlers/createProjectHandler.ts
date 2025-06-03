import * as path from 'path';
import { FileSystemHelper } from '../core/filesystem';

class CreateProjectHandler {
  constructor(
    private contextRoot: string,
    private fsHelper: FileSystemHelper = new FileSystemHelper()
  ) {}

  async initProject(projectPath: string): Promise<string> {
    const projectId = path.basename(projectPath);
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