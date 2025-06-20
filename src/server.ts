#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import handlers
import ListProjectsHandler from './handlers/listProjectsHandler';
import ListContextsHandler from './handlers/listContextsHandler';
import GetContextHandler from './handlers/getContextHandler';
import UpdateContextHandler from './handlers/updateContextHandler';
import CreateProjectHandler from './handlers/createProjectHandler';
import { FileSystemHelper } from './models/context_types/utilities/fileSystem';
import ResetContextHandler from './handlers/resetContextHandler';
import GetProjectTemplatesHandler from './handlers/getProjectTemplatesHandler';

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private persistenceHelper: FileSystemHelper;
  private listProjectsHandler!: ListProjectsHandler;
  private listContextsHandler!: ListContextsHandler;
  private getContextHandler!: GetContextHandler;
  private updateContextHandler!: UpdateContextHandler;
  private createProjectHandler!: CreateProjectHandler;
  private resetContextHandler!: ResetContextHandler;
  private getProjectTemplatesHandler!: GetProjectTemplatesHandler;

  constructor() {
    // Initialize filesystem helper
    this.persistenceHelper = new FileSystemHelper();
    
    this.listProjectsHandler = new ListProjectsHandler(this.persistenceHelper);
    this.listContextsHandler = new ListContextsHandler(this.persistenceHelper);
    this.createProjectHandler = new CreateProjectHandler(this.persistenceHelper);
    this.getContextHandler = new GetContextHandler(this.persistenceHelper);
    this.updateContextHandler = new UpdateContextHandler(this.persistenceHelper);
    this.resetContextHandler = new ResetContextHandler(this.persistenceHelper);
    this.getProjectTemplatesHandler = new GetProjectTemplatesHandler(this.persistenceHelper);
    
    // TODO: indicate that further instruction about how to use the contexts is available somehwere and make it dynamic
    this.server = new Server(
      {
        name: 'shared-project-context',
        version: '1.0.0',
        description: `This server stores shared context exclusively for AI assistants.

Contexts are saved into into projects, and each project has its own context files.
Contexts are used for storing important information between sessions and for you or other AI assistants to quickly come up to date on previous discussions.
Contexts should be kept concise and focused.
All contexts except "other" follow must follow a prescribed template and will be validated.

This server manages four context types, each with distinct behaviors:
- session_summary: Chronological log of the development session activity. AVOID code samples! Always appends new context.
- mental_model: Technical architecture understanding
- features: A list of features, their implementation status and other relevant information
- other: The "other" type is a catch-all for individually named arbitrary contexts.

You should refresh your context if some time has passed since you last used this server.

When working with this server, start by listing projects, then list contexts for your project to see what information is already available.
Call the project_templates tool before updating context to retrieve the required template for the context type you are updating.`,
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
          name: 'list_contexts',
          description: 'Discover what contexts exist for a specific project. Use this after selecting a project to see what information is already stored (mental_model, session_summary, features, etc.) before reading or updating context. This shows you what context types are available so you can retrieve relevant information.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' }
            },
            required: ['project_name']
          }
        },
        {
          name: 'create_project',
          description: 'Create a project to store context in. Project names are one or more words separated by hyphens. For example, "my-project" or "my-project-2".',
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
          description: 'Retrieve existing context from within a project. Use this to read information that you or another AI assistant previously stored. If using the "other" context_type a context_name must be provided.  Always use list_context_types first to see what context files are available for the project.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' },
              context_type: { type: 'string' },
              context_name: { type: 'string' }
            },
            required: ['project_name', 'context_type']
          }
        },
        {
          name: 'update_context',
          description: 'Update context for a project with information that will be stored for future AI assistant sessions. The update behavior depends on context type: session_summary always appends new context, mental_model and features will replace all existing context of that type, the "other" type requires a "context_name" parameter and will alwyas overwrite if a context with that name already exists. Always use get_context before to make sure you have all the context before updating.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' },
              context_type: { type: 'string' },
              context_name: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['project_name', 'context_type', 'content']
          }
        },
        {
          name: 'reset_context',
          description: 'Caution! Reset a context_type in a project for a fresh start. Context_name is required for the "other" context_type. Always use list_context_types first to see what context files are available for the project.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' },
              context_type: { type: 'string' },
              context_name: { type: 'string' }
            },
            required: ['project_name', 'context_type']
          }
        },
        {
          name: 'get_project_templates',
          description: 'Retrieve the project templates for a project. contexts must be formatted according to the appropriate template in order to update successfully.',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string' }
            },
            required: ['project_name']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { params } = request;
      const { name, arguments: args = {} } = params;
      
        try {
          switch (name) {
            case 'list_contexts':
              return await this.listContextsHandler.handle({
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
              return await this.createProjectHandler.handle({
                projectName: args.project_name as string
              });

            case 'reset_context':
              return await this.resetContextHandler.handle({
                projectName: args.project_name as string,
                contextType: args.context_type as string,
                contextName: args.context_name as string
              });              

            case 'get_project_templates':
              return await this.getProjectTemplatesHandler.handle({
                projectName: args.project_name as string
              });          
              
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