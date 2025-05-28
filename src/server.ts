import { MockMCPServer } from './mock-mcp-server';
import { validateContent, MENTAL_MODEL_SCHEMA, SESSION_SUMMARY_SCHEMA } from './validation';
import { 
  ContextUpdate, 
  ContextResult, 
  UpdateResult, 
  MCPTool, 
  ToolExecutionResult,
  ContextFileType 
} from './types';

// Map of file types to their schemas
const SCHEMA_MAP: Record<ContextFileType, object> = {
  mental_model: MENTAL_MODEL_SCHEMA,
  session_summary: SESSION_SUMMARY_SCHEMA,
  bugs: MENTAL_MODEL_SCHEMA, // Reuse mental model schema for bugs
  features: MENTAL_MODEL_SCHEMA, // Reuse mental model schema for features
};

// Default templates for each context type
const TEMPLATES: Record<ContextFileType, string> = {
  mental_model: `# Project Mental Model\n\n## Overview\n\n## Architecture\n\n## Key Components\n\n## Data Flow\n`,
  session_summary: `# Session Summary\n\n## Changes\n\n### Added\n\n### Changed\n\n### Fixed\n`,
  bugs: `# Bug Reports\n\n## Open Issues\n\n## Resolved Issues\n`,
  features: `# Features\n\n## Current Features\n\n## Planned Features\n`,
};

export class MCPServer {
  private server: MockMCPServer;
  private contexts: Map<string, Map<ContextFileType, { content: string; lastModified: Date }>>;

  constructor() {
    this.contexts = new Map();
    this.server = new MockMCPServer();
    this.setupTools();
  }

  private setupTools() {
    // Register tools with the MCP server
    this.server.setRequestHandler('listTools', async () => ({
      tools: this.listTools()
    }));

    this.server.setRequestHandler('callTool', async ({ name, parameters }: { name: string; parameters: any }) => {
      return this.executeTool(name, parameters);
    });
  }

  // Implementation of the get_context tool
  async getContext(projectId: string, fileType: ContextFileType): Promise<ContextResult> {
    let projectContexts = this.contexts.get(projectId);
    
    if (!projectContexts) {
      projectContexts = new Map();
      this.contexts.set(projectId, projectContexts);
    }

    let context = projectContexts.get(fileType);
    
    // If no context exists, create a new one from template
    if (!context) {
      context = {
        content: TEMPLATES[fileType],
        lastModified: new Date()
      };
      projectContexts.set(fileType, context);
    }

    return {
      content: context.content,
      lastModified: context.lastModified
    };
  }

  // Implementation of the update_context tool
  async updateContext(update: ContextUpdate): Promise<UpdateResult> {
    const { projectId, fileType, content } = update;
    const schema = SCHEMA_MAP[fileType];
    
    // Validate the content against the schema
    const validation = validateContent(content, schema);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
        correctionGuidance: validation.correctionGuidance
      };
    }

    // Update the context
    let projectContexts = this.contexts.get(projectId);
    if (!projectContexts) {
      projectContexts = new Map();
      this.contexts.set(projectId, projectContexts);
    }

    projectContexts.set(fileType, {
      content,
      lastModified: new Date()
    });

    return {
      success: true,
      message: 'Context updated successfully'
    };
  }

  // List available tools
  listTools(): MCPTool[] {
    return [
      {
        name: 'get_context',
        description: 'Get context file with current content',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            file_type: { 
              type: 'string', 
              enum: ['mental_model', 'session_summary', 'bugs', 'features'] 
            }
          },
          required: ['project_id', 'file_type']
        }
      },
      {
        name: 'update_context',
        description: 'Update context file with validation and correction guidance',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            file_type: { 
              type: 'string', 
              enum: ['mental_model', 'session_summary', 'bugs', 'features'] 
            },
            content: { type: 'string' }
          },
          required: ['project_id', 'file_type', 'content']
        }
      }
    ];
  }

  // Execute a tool by name with parameters
  async executeTool(name: string, params: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      switch (name) {
        case 'get_context':
          const getResult = await this.getContext(params.project_id, params.file_type);
          return { success: true, ...getResult };
          
        case 'update_context':
          const updateResult = await this.updateContext({
            projectId: params.project_id,
            fileType: params.file_type,
            content: params.content
          });
          // Remove success from the spread to avoid duplicate property
          const { success, ...rest } = updateResult;
          return { success, ...rest };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: String(error)
      };
    }
  }

  // For testing purposes
  async resetTestData() {
    this.contexts.clear();
  }
}

// Create a singleton instance
export const contextServer = new MCPServer();

// Start the server if this file is run directly
if (require.main === module) {
  contextServer['server'].start();
}
