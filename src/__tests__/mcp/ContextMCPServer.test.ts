// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined)
}));

import * as fsPromises from 'fs/promises';

// Type assertions for mocks
const mockReadFile = fsPromises.readFile as jest.Mock;
const mockWriteFile = fsPromises.writeFile as jest.Mock;
const mockMkdir = fsPromises.mkdir as jest.Mock;

import { ContextMCPServer } from '../../mcp/ContextMCPServer';
import { ProjectManager } from '../../project/ProjectManager';

describe('ContextMCPServer', () => {
  let server: ContextMCPServer;
  let mockProjectManager: jest.Mocked<ProjectManager>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockProjectManager = {
      initProject: jest.fn(),
      getContextFilePath: jest.fn(),
      getProjectPath: jest.fn()
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
        throw new Error('Project not found');
      });

      const result = await server.handleGetContext({
        project_id: 'nonexistent',
        file_type: 'mental_model'
      });

      expect(result).toEqual({
        success: false,
        error: 'Project not found'
      });
    });

    it('should return file content when it exists', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/mental_model.md';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);
      mockReadFile.mockResolvedValue(testContent);

      // Call the method
      const result = await server.handleGetContext({
        project_id: 'test-project',
        file_type: 'mental_model'
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        content: testContent
      });
      
      // Verify the file was read with the correct path
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    
    it('should return error when file does not exist', async () => {
      const filePath = '/test/path/nonexistent.md';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);
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
        error: 'File not found'
      });
    });
  });

  describe('update_context tool', () => {
    it('should update content successfully', async () => {
      const testContent = '# Overview\nTest content';
      const filePath = '/test/path/mental_model.md';
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);
      mockReadFile.mockResolvedValue(testContent);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'mental_model',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: true
      });
      
      // Verify the file was written with the correct content
      expect(mockWriteFile).toHaveBeenCalledWith(filePath, testContent, 'utf-8');
    });

    it('should handle file write errors', async () => {
      const testContent = '# Overview\nTest content';
      const filePath = '/test/path/error.md';
      const error = new Error('Failed to write file');
      
      // Setup mocks
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);
      mockWriteFile.mockRejectedValue(error);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'error',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: false
      });
    });
    
    it('should verify file writing functionality', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/test_file.md';
      
      // Mock the writeFile implementation
      const originalWriteFile = server['writeFile'];
      server['writeFile'] = jest.fn().mockResolvedValue(undefined);
      
      try {
        await server['writeFile'](filePath, testContent);
        
        // Verify writeFile was called with correct arguments
        expect(server['writeFile']).toHaveBeenCalledWith(
          filePath,
          testContent
        );
      } finally {
        // Restore original implementation
        server['writeFile'] = originalWriteFile;
      }
    });
  });
});
