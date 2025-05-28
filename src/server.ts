#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ProjectManager } from './project/ProjectManager.js';
import { ValidationEngine } from './validation/ValidationEngine.js';
import { ContextMCPServer } from './mcp/ContextMCPServer.js';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default context root directory
const DEFAULT_CONTEXT_ROOT = path.join(os.homedir(), '.cxms');

// Main server class that implements the MCP protocol
class ContextManagerServer {
  private server: Server;
  private contextMCPServer: ContextMCPServer;
  private projectManager: ProjectManager;
  private validationEngine: ValidationEngine;

  constructor() {
    // Initialize components
    this.projectManager = new ProjectManager(DEFAULT_CONTEXT_ROOT);
    this.validationEngine = new ValidationEngine();
    this.contextMCPServer = new ContextMCPServer(this.projectManager, this.validationEngine);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'context-manager',
        version: '1.0.0',
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
            return await this.contextMCPServer.handleGetContext(args);
            
          case 'update_context':
            return await this.contextMCPServer.handleUpdateContext(args);
            
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Context Manager MCP Server is running on stdio');
  }
}
// Start the server when this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ContextManagerServer();
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export the server for testing and programmatic usage
export { ContextManagerServer };