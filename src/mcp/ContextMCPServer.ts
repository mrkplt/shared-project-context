import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as path from 'path';
import { ProjectManager } from '../project/ProjectManager';
import { ValidationEngine } from '../validation/ValidationEngine';

// Define file system interface for better testability
interface FileSystem {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
}

export class ContextMCPServer {
  private server: Server;
  private projectManager: ProjectManager;
  private validationEngine: ValidationEngine;
  private fs: FileSystem;

  constructor(
    projectManager: ProjectManager, 
    validationEngine: ValidationEngine,
    fileSystem?: Partial<FileSystem>
  ) {
    this.projectManager = projectManager;
    this.validationEngine = validationEngine;
    
    // Use provided file system or default to Node's fs/promises
    this.fs = {
      readFile: fileSystem?.readFile || (async (p, enc) => {
        const fs = await import('fs/promises');
        return fs.readFile(p, enc);
      }),
      writeFile: fileSystem?.writeFile || (async (p, content) => {
        const fs = await import('fs/promises');
        return fs.writeFile(p, content, 'utf-8');
      }),
      mkdir: fileSystem?.mkdir || (async (p, options) => {
        const fs = await import('fs/promises');
        return fs.mkdir(p, options);
      })
    };
    
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
    try {
      return await this.fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    await this.fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.fs.writeFile(filePath, content);
  }
}
