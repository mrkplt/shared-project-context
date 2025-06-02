import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export class ProjectManager {
  private contextRoot: string;

  constructor() {
    this.contextRoot = path.join(os.homedir(), '.shared-project-context');;
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

  async listProjects(): Promise<string> {
    const projectsDir = path.join(this.contextRoot, 'projects');
    
    try {
      await fs.access(projectsDir);
      
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      const projects = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
        
      return JSON.stringify(projects);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Projects directory doesn't exist yet, return empty array
        return JSON.stringify([]);
      } else if (error.code === 'EACCES') {
        // Permission denied
        throw new Error('Insufficient permissions to read projects directory');
      }
      
      // Re-throw unexpected errors
      throw error;
    }
  }
}
