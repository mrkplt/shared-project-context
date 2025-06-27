#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import handlers
import ListProjectsHandler from './handlers/listProjectsHandler.js';
import ListContextsHandler from './handlers/listContextsHandler.js';
import GetContextHandler from './handlers/getContextHandler.js';
import UpdateContextHandler from './handlers/updateContextHandler.js';
import CreateProjectHandler from './handlers/createProjectHandler.js';
import { FileSystemHelper } from './models/context_types/utilities/fileSystem.js';
import ClearContextHandler from './handlers/clearContextHandler.js';
import GetProjectTemplatesHandler from './handlers/getProjectTemplatesHandler.js';

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private persistenceHelper: FileSystemHelper;
  private listProjectsHandler!: ListProjectsHandler;
  private listContextsHandler!: ListContextsHandler;
  private getContextHandler!: GetContextHandler;
  private updateContextHandler!: UpdateContextHandler;
  private createProjectHandler!: CreateProjectHandler;
  private clearContextHandler!: ClearContextHandler;
  private getProjectTemplatesHandler!: GetProjectTemplatesHandler;

  constructor() {
    // Initialize filesystem helper
    this.persistenceHelper = new FileSystemHelper();
    
    this.listProjectsHandler = new ListProjectsHandler(this.persistenceHelper);
    this.listContextsHandler = new ListContextsHandler(this.persistenceHelper);
    this.createProjectHandler = new CreateProjectHandler(this.persistenceHelper);
    this.getContextHandler = new GetContextHandler(this.persistenceHelper);
    this.updateContextHandler = new UpdateContextHandler(this.persistenceHelper);
    this.clearContextHandler = new ClearContextHandler(this.persistenceHelper);
    this.getProjectTemplatesHandler = new GetProjectTemplatesHandler(this.persistenceHelper);
    
    // TODO: indicate that further instruction about how to use the contexts is available somehwere and make it dynamic
    this.server = new Server(
      {
        name: 'shared-project-context',
        version: '1.0.0',
        description: `This server helps AI assistants maintain shared context across conversations and sessions.
Contexts is organized into projects, with each project containing its own context files. Use contexts to store important information that helps you or other AI assistants quickly understand previous discussions and maintain continuity. Keep contexts concise and focused on the most relevant details.
The server supports different types of contexts, each with its own behavior and requirements. You'll discover what's available when you explore the contexts for your chosen project.

Getting started workflow:

List available projects to see what already exists
Show the options to the user and ask them which project to work with
List the contexts within that project to understand what information is already stored
Before updating any context, call the project templates tool to get the required format for that context type`,
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
          description: 'Discover what contexts exist for a specific project. Use this after selecting a project to see what information is already stored before getting or updating context.',
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
          description: 'Create a project to store context in. Project names are one or more words separated by hyphens. For example, "my-project" or "my-project-2". Use this when no suitable existing project is available for your current work.',
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
          description: 'Update context for a project with information that will be stored for future AI assistant sessions.  Always use get_context first to make sure you do not lose important existing context before updating. Call get_project_templates next to retrieve the required format for the context type you\'re updating. Some context types may require specifying a context_name.',
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
          name: 'clear_context',
          description: 'Caution! Clear a context_type in a project for a fresh start. Context_name may be required. Use list_contexts first to see what contexts are available for the project.',
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
          description: 'Retrieve the project templates for a project. Contexts must be formatted according to the appropriate template in order to update successfully. Call this after listing contexts but before updating any context to ensure you have the proper formatting requirements.',
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

            case 'clear_context':
              return await this.clearContextHandler.handle({
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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this module is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ContextManagerServer();
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export the server for testing and programmatic usage
export { ContextManagerServer };