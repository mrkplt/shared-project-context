#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ProjectManager } from './project/ProjectManager';
import { ContextMCPServer } from './mcp/ContextMCPServer';
import * as path from 'path';
import * as os from 'os';

// Default context root directory
const DEFAULT_CONTEXT_ROOT = path.join(os.homedir(), 'src/cxms');

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private contextMCPServer: ContextMCPServer;
  private projectManager: ProjectManager;

  constructor() {
    // Initialize components
    this.projectManager = new ProjectManager(DEFAULT_CONTEXT_ROOT);
    this.contextMCPServer = new ContextMCPServer(this.projectManager);
    
    // Initialize MCP server with proper configuration
    this.server = new Server(
      {
        name: 'context-manager',
        version: '1.0.0',
        description: 'Context Management Server for MCP',
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
        // console.log(`Shutting down (${signal})...`);
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