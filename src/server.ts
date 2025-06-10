#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import handlers
import ListProjectsHandler from './handlers/listProjectsHandler';
import ListcontextTypesHandler from './handlers/listContextTypesHandler';
import GetContextHandler from './handlers/getContextHandler';
import UpdateContextHandler from './handlers/updateContextHandler';
import CreateProjectHandler from './handlers/createProjectHandler';
import { FileSystemHelper } from './models/context_types/utilities/fileSystem';

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private fsHelper: FileSystemHelper;
  private listProjectsHandler!: ListProjectsHandler;
  private listcontextTypesHandler!: ListcontextTypesHandler;
  private getContextHandler!: GetContextHandler;
  private updateContextHandler!: UpdateContextHandler;
  private createProjectHandler!: CreateProjectHandler;

  constructor() {
    // Initialize filesystem helper
    this.fsHelper = new FileSystemHelper();
    
    this.listProjectsHandler = new ListProjectsHandler(this.fsHelper);
    this.listcontextTypesHandler = new ListcontextTypesHandler(this.fsHelper);
    this.createProjectHandler = new CreateProjectHandler(this.fsHelper);
    this.getContextHandler = new GetContextHandler(this.fsHelper);
    this.updateContextHandler = new UpdateContextHandler(this.fsHelper);
    
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
          description: 'Discover all available projects when starting work. Use this first if you don\'t know which project the user is referring to, or to see all projects available for context management. Always follow up with list_context_types to see what context exists for your chosen project.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'list_context_types',
          description: 'Discover what context files exist for a specific project. Use this after selecting a project to see what information is already stored (mental_model, session_summary, features, bugs, etc.) before reading or updating context. This shows you what context types are available so you can retrieve relevant information.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' }
            },
            required: ['project_name']
          }
        },
        {
          name: 'get_context',
          description: 'Retrieve existing context from a specific file type within a project. Use this to read information that you or another AI assistant previously stored. Always use list_context_types first to see what context files are available for the project.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' },
              context_type: { 
                type: 'string', 
                enum: ['mental_model', 'session_summary', 'other', 'features'] 
              },
              context_name: { type: 'string' }
            },
            required: ['project_name', 'context_type']
          }
        },
        {
          name: 'update_context',
          description: 'Update ',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' },
              context_type: { 
                type: 'string', 
                enum: ['mental_model', 'session_summary', 'other', 'features'] 
              },
              context_name: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['project_name', 'context_type', 'content']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { params } = request;
      const { name, arguments: args = {} } = params;
      
        try {
          switch (name) {
            case 'list_context_types':
              return await this.listcontextTypesHandler.handle({
                projectName: args.project_name as string
              });

            case 'list_projects':
              return await this.listProjectsHandler.handle();
              
              case 'get_context':
                return await this.getContextHandler.handle({
                  projectName: args.project_name as string,     // Map snake_case to camelCase
                  contextType: args.context_type as string,     // Map snake_case to camelCase
                  contextName: args.context_name as string
                });
              
            case 'update_context':
              return await this.updateContextHandler.handle({ 
                  projectName: args.project_name as string,
                  contextType: args.context_type as string,
                  contextName: args.context_name as string,
                  content: args.content as string

              });

            case 'create_project':
              return await this.createProjectHandler.handle(args.projectName as string);
              
            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error handling tool ${name}:`, errorMessage);
          throw error;
        }
    });
  }
  
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