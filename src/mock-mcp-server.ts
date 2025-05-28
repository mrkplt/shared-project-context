import { MCPTool, ToolExecutionResult } from './types';

/**
 * A simplified mock implementation of the MCP Server
 */
export class MockMCPServer {
  private tools: MCPTool[] = [];
  private requestHandlers: Record<string, (params: any) => Promise<any>> = {};

  constructor() {
    this.setupDefaultTools();
  }

  private setupDefaultTools() {
    // Will be populated by the actual server
  }

  setRequestHandler(toolName: string, handler: (params: any) => Promise<any>) {
    this.requestHandlers[toolName] = handler;
  }

  async callTool(toolName: string, params: any): Promise<ToolExecutionResult> {
    const handler = this.requestHandlers[toolName];
    if (!handler) {
      throw new Error(`No handler registered for tool: ${toolName}`);
    }
    
    try {
      const result = await handler(params);
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: String(error)
      };
    }
  }

  // For testing
  registerTool(tool: MCPTool) {
    this.tools.push(tool);
  }

  // Mock implementation of the MCP server start method
  start() {
    // In a real implementation, this would start the server
    console.log('Mock MCP Server started');
  }
}
