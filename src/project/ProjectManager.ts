import * as path from 'path';
import * as fs from 'fs/promises';

export class ProjectManager {
  private projects: Map<string, ProjectConfig> = new Map();
  private contextRoot: string;

  constructor(contextRoot: string) {
    this.contextRoot = contextRoot;
  }

  getContextRoot(): string {
    return this.contextRoot;
  }

  getContextFilePath(projectId: string, fileType: string): string {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return path.join(project.contextPath, `${fileType}.md`);
  }

  async initProject(projectPath: string): Promise<string> {
    const projectId = path.basename(projectPath);
    const contextPath = path.join(this.contextRoot, 'projects', projectId);
    console.log(`[DEBUG] initProject - projectPath: ${projectPath}`);
    console.log(`[DEBUG] initProject - contextPath: ${contextPath}`);
    
    try {
      await fs.access(contextPath);
      console.log(`[DEBUG] Project directory already exists: ${contextPath}`);
      // Project already exists
    } catch (error) {
      // Project doesn't exist, create it
      console.log(`[DEBUG] Creating project directory: ${contextPath}`);
      try {
        await fs.mkdir(contextPath, { recursive: true });
        console.log(`[DEBUG] Successfully created directory: ${contextPath}`);
      } catch (mkdirError) {
        console.error(`[ERROR] Failed to create directory ${contextPath}:`, mkdirError);
        throw mkdirError;
      }
    }
    
    const config: ProjectConfig = {
      id: projectId,
      name: path.basename(projectPath),
      path: projectPath,
      contextPath
    };
    
    this.projects.set(projectId, config);
    return projectId;
  }
}

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  contextPath: string;
}
