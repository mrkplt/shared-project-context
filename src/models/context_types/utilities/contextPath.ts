import * as path from 'path';
import * as fs from 'fs/promises';

export class ContextPathHelper {
  constructor(private contextRoot: string) {}

  async getContextFilePath(projectName: string, contextType: string): Promise<string> {
    const projectPath = path.join(this.contextRoot, 'projects', projectName);
    try {
      await fs.access(projectPath);
      return path.join(projectPath, `${contextType}.md`);
    } catch (error) {
      throw new Error(`Project not found: ${projectName}`);
    }
  }
}
