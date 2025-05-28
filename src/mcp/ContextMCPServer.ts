import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as path from 'path';
import { ProjectManager } from '../project/ProjectManager';
import { ValidationEngine } from '../validation/ValidationEngine';

export class ContextMCPServer {
  private server: Server;
  private projectManager: ProjectManager;
  private validationEngine: ValidationEngine;

  constructor(projectManager: ProjectManager, validationEngine: ValidationEngine) {
    this.projectManager = projectManager;
    this.validationEngine = validationEngine;
    this.server = new Server({
      name: 'context-manager',
      version: '1.0.0'
    });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // In a real implementation, this would set up MCP protocol handlers
    // For now, we'll just expose the methods directly for testing
  }

  async handleGetContext(args: { project_id: string; file_type: string }): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      const filePath = this.projectManager.getContextFilePath(args.project_id, args.file_type);
      const content = await this.readFile(filePath);
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async handleUpdateContext(args: {
    project_id: string;
    file_type: string;
    content: string;
  }): Promise<{
    success: boolean;
    validation?: {
      valid: boolean;
      errors: Array<{
        type: string;
        section?: string;
        message: string;
        severity: 'error' | 'warning';
        correction_prompt: string;
        template_example: string;
      }>;
    };
  }> {
    try {
      // In a real implementation, we would load the appropriate template here
      const template = {
        name: 'Default Template',
        description: 'Default validation template',
        schema: {
          required_sections: [],
          section_schemas: {},
          format_rules: []
        },
        correction_prompts: {},
        examples: []
      };

      const validation = this.validationEngine.validateContent(args.content, template);
      
      if (!validation.valid) {
        return { success: false, validation };
      }

      const filePath = this.projectManager.getContextFilePath(args.project_id, args.file_type);
      await this.writeFile(filePath, args.content);
      
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private async readFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
}
