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
Context files are never for humans so you can write to them in the most efficient ways possible.
Context files should be kept concise and focused to conserve agent context.

You should refresh your context if some time has passed since you last used this server.
When working with this server, start by listing projects to discover what's available, then list file types for your chosen project to see what context already exists before reading or updating files.`,
      },
      {
        capabilities: {
          tools: {}
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
          name: 'list_projects',
          description: 'Discover all available projects when starting work. Use this first if you don\'t know which project the user is referring to, or to see all projects available for context management. Always follow up with list_file_types to see what context exists for your chosen project.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'list_file_types',
          description: 'Discover what context files exist for a specific project. Use this after selecting a project to see what information is already stored (mental_model, session_summary, features, bugs, etc.) before reading or updating context. This shows you what context types are available so you can retrieve relevant information.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' }
            },
            required: ['project_id']
          }
        },
        {
          name: 'get_context',
          description: 'Retrieve existing context from a specific file type within a project. Use this to read information that you or another AI assistant previously stored. Always use list_file_types first to see what context files are available for the project.',
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
          name: 'replace_context',
          description: 'Create or completely replace the content of a context file for a project. This overwrites the entire file with new content - it does not append. Use this to store new information or completely update existing context that you or other AI assistants will need later.',
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
          }
        },
        {
          name: 'append_context',
          description: 'Add new content to an existing context file without replacing what\'s already there. This adds content to the end of the file with proper spacing. Use this to incrementally build up context over time, such as adding new session notes, additional features to a list, or extending documentation. If the file doesn\'t exist, it will be created with the new content.',
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
          }
        }
      ]
    }));
  
    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { params } = request;
      const { name, arguments: args = {} } = params;
      
      switch (name) {
        case 'list_file_types':
          return await this.contextMCPServer.handleListFileTypes(args as { project_id: string });
        case 'list_projects':
          return {
            content: [{
              type: 'text',
              text: await this.projectManager.listProjects()
            }]
          };
        case 'get_context':
          return await this.contextMCPServer.handleGetContext(args as { project_id: string; file_type: string });
        case 'update_context':
          return await this.contextMCPServer.handleUpdateContext(
            args as { project_id: string; file_type: string; content: string }
          );
        case 'append_context':
          return await this.contextMCPServer.handleAppendContext(
            args as { project_id: string; file_type: string; content: string }
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
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