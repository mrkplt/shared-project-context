#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ProjectManager } from './project/ProjectManager';
import { ContextMCPServer } from './mcp/ContextMCPServer';

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private contextMCPServer: ContextMCPServer;
  private projectManager: ProjectManager;

  constructor() {
    // Initialize components
    this.projectManager = new ProjectManager;
    this.contextMCPServer = new ContextMCPServer(this.projectManager);
    
    // Initialize MCP server with proper configuration
    this.server = new Server(
      {
        name: 'shared-project-context',
        version: '1.0.0',
        description: `This server is intended for storing context files for AI assistants.
Project names are one or more words separated by hyphens. For example, "my-project" or "my-project-2".
Context files go into projects, and each project has its own context files.
Context files are named with one or more words separated by hyphens. For example, "mental-model" or "session-summary".
Context files are used for storing important information between sessions and for you or other AI assistants to quickly come up to date on previous discussions.
Context files are never for humans so you can write to them in the most efficient ways possible.`,
      },
      {
        capabilities: {
          tools: {
            get_context: {
              description: 'Retrieve the context from a file for a project that you or another AI assistant stored for later use.',
              parameters: {
                type: 'object',
                properties: {
                  project_id: { type: 'string' },
                  file_type: { type: 'string' }
                },
                required: ['project_id', 'file_type']
              }
            },
            update_context: {
              description: 'Update or create a context file for a project.',
              parameters: {
                type: 'object',
                properties: {
                  project_id: { type: 'string' },
                  file_type: { type: 'string' },
                  content: { type: 'string' }
                },
                required: ['project_id', 'file_type', 'content']
              }
            }
          }
        }
      }
    );
    
    // Set up request handlers
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_context',
          description: 'Retrieve the context from a file for a project that you or another AI assistant stored for later use.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' },
              file_type: { 
                type: 'string', 
                // enum: ['mental_model', 'session_summary', 'bugs', 'features'] 
              }
            },
            required: ['project_id', 'file_type']
          }
        },
        {
          name: 'update_context',
          description: 'Update a projects context file with with new information you or another agent will want to use later',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' },
              file_type: { 
                type: 'string', 
                // enum: ['mental_model', 'session_summary', 'bugs', 'features'] 
              },
              content: { type: 'string' }
            },
            required: ['project_id', 'file_type', 'content']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              content: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    text: { type: 'string' }
                  },
                  required: ['type', 'text']
                }
              },
              error: { type: 'string' },
              validation: {
                type: 'object',
                properties: {
                  valid: { type: 'boolean' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        section: { type: 'string' },
                        message: { type: 'string' },
                        severity: { type: 'string', enum: ['error', 'warning'] },
                        correction_prompt: { type: 'string' },
                        template_example: { type: 'string' }
                      },
                      required: ['type', 'message', 'severity', 'correction_prompt', 'template_example']
                    }
                  }
                },
                required: ['valid', 'errors']
              }
            },
            required: ['success']
          }
        }
      ]
    }));
  
    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'get_context':
            return await this.contextMCPServer.handleGetContext(args as { project_id: string; file_type: string });
            
          case 'update_context':
            return await this.contextMCPServer.handleUpdateContext(
              args as { project_id: string; file_type: string; content: string }
            );
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }
  // Start the server
  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      
      // Connect the server to the transport
      await this.server.connect(transport);
      
      // Handle process termination
      const shutdown = (signal: string) => {
        process.exit(0);
      };
      
      // Set up signal handlers
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
      });
      
      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
      });
      
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}
// Start the server when this file is run directly
if (require.main === module) {
  const server = new ContextManagerServer();
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export the server for testing and programmatic usage
export { ContextManagerServer };