import * as path from 'path';
import * as fs from 'fs/promises';
import { ContextTemplate } from '../types/template';

export class ProjectManager {
  private projects: Map<string, ProjectConfig> = new Map();
  private contextRoot: string;

  constructor(contextRoot: string) {
    this.contextRoot = contextRoot;
  }

  async initProject(projectPath: string): Promise<string> {
    const projectId = this.generateProjectId(projectPath);
    const contextPath = path.join(this.contextRoot, 'projects', projectId);
    
    try {
      await fs.access(contextPath);
      // Project already exists
    } catch (error) {
      // Project doesn't exist, create it
      await fs.mkdir(contextPath, { recursive: true });
      // Initialize with default templates
      await this.initializeTemplates(contextPath);
    }
    
    const config: ProjectConfig = {
      id: projectId,
      name: path.basename(projectPath),
      path: projectPath,
      contextPath,
      templates: await this.loadTemplates(contextPath)
    };
    
    this.projects.set(projectId, config);
    return projectId;
  }

  getContextFilePath(projectId: string, fileType: string): string {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return path.join(project.contextPath, `${fileType}.md`);
  }

  private generateProjectId(projectPath: string): string {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < projectPath.length; i++) {
      const char = projectPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `project-${Math.abs(hash).toString(16)}`;
  }

  private async initializeTemplates(contextPath: string): Promise<void> {
    const templatesDir = path.join(contextPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    
    // Create a default template
    const defaultTemplate: ContextTemplate = {
      name: 'default',
      description: 'Default template',
      schema: {
        required_sections: ['overview'],
        section_schemas: {
          overview: {
            name: 'Overview',
            required: true,
            format: 'markdown',
            min_length: 10
          }
        },
        format_rules: []
      },
      correction_prompts: {},
      examples: [
        '# Project Overview\n\nThis is an example project overview. It should contain a brief description of the project, its purpose, and key objectives.'
      ]
    };
    
    // Write the default template to a file
    await fs.writeFile(
      path.join(templatesDir, 'default.json'),
      JSON.stringify(defaultTemplate, null, 2),
      'utf-8'
    );
  }

  private async loadTemplates(templatesDir: string): Promise<Record<string, ContextTemplate>> {
    try {
      const templates: Record<string, ContextTemplate> = {};
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
          const template = JSON.parse(content) as ContextTemplate;
          templates[template.name] = template;
        }
      }
      
      return templates;
    } catch (error) {
      console.error(`Error loading templates from ${templatesDir}:`, error);
      return {};
    }
  }
}

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  contextPath: string;
  templates: Record<string, ContextTemplate>;
}
