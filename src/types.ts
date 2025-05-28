// Supported context file types
export type ContextFileType = 'mental_model' | 'session_summary' | 'bugs' | 'features';

// Context update request
export interface ContextUpdate {
  projectId: string;
  fileType: ContextFileType;
  content: string;
}

// Context retrieval result
export interface ContextResult {
  content: string;
  lastModified: Date;
}

// Update operation result
export interface UpdateResult {
  success: boolean;
  message: string;
  errors?: ValidationError[];
  correctionGuidance?: CorrectionGuidance;
}

// Validation error details
export interface ValidationError {
  message: string;
  path?: string;
  suggestion?: string;
}

// Guidance for correcting invalid content
export interface CorrectionGuidance {
  requiredSections?: string[];
  retryInstructions: string;
}

// MCP Tool definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

// MCP Tool execution result
export interface ToolExecutionResult {
  success: boolean;
  [key: string]: any;
}

// MCP Server interface
export interface IMCPServer {
  getContext(projectId: string, fileType: ContextFileType): Promise<ContextResult>;
  updateContext(update: ContextUpdate): Promise<UpdateResult>;
  listTools(): Promise<MCPTool[]>;
  executeTool(name: string, params: Record<string, any>): Promise<ToolExecutionResult>;
}
