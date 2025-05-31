import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

export class ProjectManager {
  private contextRoot: string;

  constructor(contextRoot: string) {
    this.contextRoot = contextRoot;
  }

  getContextRoot(): string {
    return this.contextRoot;
  }

  async getContextFilePath(projectId: string, fileType: string): Promise<string> {
    const projectPath = path.join(this.contextRoot, 'projects', projectId);
    try {
      await fs.access(projectPath);
      return path.join(projectPath, `${fileType}.md`);
    } catch (error) {
      throw new Error(`Project not found: ${projectId}`);
    }
  }

  async initProject(projectPath: string): Promise<string> {
    const projectId = path.basename(projectPath);
    const contextPath = path.join(this.contextRoot, 'projects', projectId);
    
    try {
      await fs.access(contextPath);
      // Project already exists
    } catch (error) {
      // Project doesn't exist, create it
      try {
        await fs.mkdir(contextPath, { recursive: true });
      } catch (mkdirError) {
        throw mkdirError;
      }
    }
    
    return projectId;
  }
}

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  contextPath: string;
}
