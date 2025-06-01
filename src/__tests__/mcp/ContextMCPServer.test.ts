// Mock the fs/promises module
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockMkdir = jest.fn().mockResolvedValue(undefined);

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  access: jest.fn()
}));

// Mock path module
const mockPath = {
  join: (...args: string[]) => args.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  basename: (p: string) => p.split('/').pop() || ''
};

jest.mock('path', () => mockPath);

import { ContextMCPServer } from '../../mcp/ContextMCPServer';
import { ProjectManager } from '../../project/ProjectManager';

describe('ContextMCPServer', () => {
  let server: ContextMCPServer;
  let mockProjectManager: jest.Mocked<ProjectManager>;
  const mockContextRoot = '/mock/context/root';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockProjectManager = {
      initProject: jest.fn(),
      getContextFilePath: jest.fn(),
      getContextRoot: jest.fn().mockReturnValue(mockContextRoot)
    } as unknown as jest.Mocked<ProjectManager>;
    
    
    // Reset all file system mocks
    mockReadFile.mockClear();
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    
    // Create server with mock file system
    server = new ContextMCPServer(
      mockProjectManager
    );
  });

  describe('get_context tool', () => {
    it('should return error for non-existent project', async () => {
      mockProjectManager.getContextFilePath.mockImplementation(() => {
        throw new Error('Project not found: test-project');
      });

      const result = await server.handleGetContext({
        project_id: 'test-project',
        file_type: 'mental_model'
      });

      expect(result).toEqual({
        success: false,
        error: 'Project not found: test-project',
        content: undefined
      });
    });

    it('should return file content when it exists', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/mental_model.md';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      mockReadFile.mockResolvedValue(testContent);

      // Call the method
      const result = await server.handleGetContext({
        project_id: 'test-project',
        file_type: 'mental_model'
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        content: [{
          type: 'text',
          text: testContent
        }]
      });
      
      // Verify the file was read with the correct path
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    
    it('should return error when file does not exist', async () => {
      const filePath = '/test/path/nonexistent.md';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      const error = new Error('File not found');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      // Call the method
      const result = await server.handleGetContext({
        project_id: 'test-project',
        file_type: 'nonexistent'
      });

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'File not found',
        content: undefined
      });
    });
  });

  describe('update_context tool', () => {
    it('should update content successfully', async () => {
      const testContent = '# Overview\nTest content';
      const filePath = '/test/path/mental_model.md';
      const projectDir = '/test/path';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      mockProjectManager.initProject = jest.fn().mockResolvedValue('test-project');
      mockProjectManager.getContextRoot.mockReturnValue(mockContextRoot);
      mockReadFile.mockResolvedValue(testContent);
      
      // Mock the directory creation
      mockMkdir.mockResolvedValue(undefined);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'mental_model',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        content: [{
          type: 'text',
          text: 'File updated successfully'
        }]
      });
      
      // Verify the file was written with the correct content
      expect(mockProjectManager.initProject).toHaveBeenCalledWith(projectDir);
      expect(mockWriteFile).toHaveBeenCalledWith(filePath, testContent, 'utf-8');
    });

    it('should handle file write errors', async () => {
      const testContent = '# Overview\nTest content';
      const filePath = '/test/path/error.md';
      const projectDir = '/test/path';
      const error = new Error('Failed to write file');
      
// Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      mockProjectManager.initProject = jest.fn().mockResolvedValue('test-project');
      mockProjectManager.getContextRoot.mockReturnValue(mockContextRoot);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(error);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'error',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: false,
        content: undefined,
        error: 'Failed to write file'
      });
      expect(mockProjectManager.initProject).toHaveBeenCalledWith(projectDir);
    });
    
    it('should handle project initialization errors', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/init_error.md';
      const projectDir = '/test/path';
      const error = new Error('Failed to initialize project');
      
// Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      mockProjectManager.initProject = jest.fn().mockImplementation((path) => {
        // The actual implementation would create the project directory
        // before failing, so we'll simulate that behavior
        const projectId = path.split('/').pop();
        return Promise.reject(error);
      });
      mockProjectManager.getContextRoot.mockReturnValue(mockContextRoot);
      mockMkdir.mockResolvedValue(undefined);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'init_error',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: false,
        content: undefined,
        error: 'Failed to initialize project'
      });
      // The initProject should be called with the full project path
      expect(mockProjectManager.initProject).toHaveBeenCalledWith(
        expect.stringContaining('/projects/test-project')
      );
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
    
    it('should handle file read errors during update', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/read_error.md';
      const projectDir = '/test/path';
      const error = new Error('Permission denied');
      
// Setup mocks
      mockProjectManager.getContextFilePath.mockResolvedValue(filePath);
      mockProjectManager.initProject = jest.fn().mockResolvedValue('test-project');
      mockProjectManager.getContextRoot.mockReturnValue(mockContextRoot);
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValue(error);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'read_error',
        content: testContent
      });

      // Verify the result - the error should be propagated from writeFile
      expect(result).toEqual({
        success: false,
        content: undefined,
        error: 'Failed to write file'
      });
      expect(mockProjectManager.initProject).toHaveBeenCalledWith(projectDir);
    });
  });

  describe('listProjects', () => {
    it('should return an empty array when projects directory does not exist', async () => {
      // Setup mocks
      const projectsDir = '/mock/projects';
      mockProjectManager.getContextRoot.mockReturnValue(projectsDir);
      
      // Mock fs.access to throw ENOENT (no such file or directory)
      const mockAccess = jest.spyOn(server as any, 'fs', 'get').mockImplementation(() => ({
        ...jest.requireActual('fs/promises'),
        access: jest.fn().mockRejectedValue({ code: 'ENOENT' })
      }));

      // Call the method
      const result = await server.listProjects();

      // Verify the result
      expect(result).toEqual({
        success: true,
        projects: []
      });
      
      // Cleanup
      mockAccess.mockRestore();
    });

    it('should return list of project directories', async () => {
      // Setup mocks
      const projectsDir = '/mock/projects';
      const mockProjects = ['project1', 'project2'];
      
      mockProjectManager.getContextRoot.mockReturnValue(projectsDir);
      
      // Mock fs.access to succeed
      const mockAccess = jest.spyOn(server as any, 'fs', 'get').mockImplementation(() => ({
        ...jest.requireActual('fs/promises'),
        access: jest.fn().mockResolvedValue(undefined),
        readdir: jest.fn().mockResolvedValue([
          { name: 'project1', isDirectory: () => true },
          { name: 'project2', isDirectory: () => true },
          { name: '.hidden', isDirectory: () => true },
          { name: 'not-a-dir', isDirectory: () => false }
        ])
      }));

      // Call the method
      const result = await server.listProjects();

      // Verify the result
      expect(result).toEqual({
        success: true,
        projects: mockProjects
      });
      
      // Verify readdir was called with correct arguments
      expect(mockAccess().readdir).toHaveBeenCalledWith(projectsDir, { withFileTypes: true });
      
      // Cleanup
      mockAccess.mockRestore();
    });

    it('should handle permission denied error', async () => {
      // Setup mocks
      const projectsDir = '/mock/projects';
      mockProjectManager.getContextRoot.mockReturnValue(projectsDir);
      
      // Mock fs.access to throw EACCES (permission denied)
      const mockAccess = jest.spyOn(server as any, 'fs', 'get').mockImplementation(() => ({
        ...jest.requireActual('fs/promises'),
        access: jest.fn().mockRejectedValue({ code: 'EACCES' })
      }));

      // Call the method
      const result = await server.listProjects();

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to read projects directory'
        }
      });
      
      // Cleanup
      mockAccess.mockRestore();
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const projectsDir = '/mock/projects';
      const errorMessage = 'Unexpected error';
      mockProjectManager.getContextRoot.mockReturnValue(projectsDir);
      
      // Mock fs.access to throw an unexpected error
      const mockAccess = jest.spyOn(server as any, 'fs', 'get').mockImplementation(() => ({
        ...jest.requireActual('fs/promises'),
        access: jest.fn().mockRejectedValue(new Error(errorMessage))
      }));

      // Call the method
      const result = await server.listProjects();

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to list projects',
          details: errorMessage
        }
      });
      
      // Cleanup
      mockAccess.mockRestore();
    });
  });
});
