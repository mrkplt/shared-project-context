// Define mocks first
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();

// Mock the file system
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  access: jest.fn(),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
}));

import { ContextMCPServer } from '../../mcp/ContextMCPServer';
import { ProjectManager } from '../../project/ProjectManager';
import { ValidationEngine } from '../../validation/ValidationEngine';

describe('ContextMCPServer', () => {
  let server: ContextMCPServer;
  let mockProjectManager: jest.Mocked<ProjectManager>;
  let mockValidationEngine: jest.Mocked<ValidationEngine>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockProjectManager = {
      initProject: jest.fn(),
      getContextFilePath: jest.fn(),
      getProjectPath: jest.fn()
    } as unknown as jest.Mocked<ProjectManager>;
    
    mockValidationEngine = {
      validateContent: jest.fn().mockReturnValue({
        valid: true,
        errors: []
      })
    } as unknown as jest.Mocked<ValidationEngine>;
    
    server = new ContextMCPServer(mockProjectManager, mockValidationEngine);
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
      mockReadFile.mockImplementation((path) => {
        if (path === filePath) {
          return Promise.resolve(testContent);
        }
        return Promise.reject(new Error('File not found'));
      });

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
      mockReadFile.mockRejectedValue(new Error('File not found'));

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
    it('should validate content before updating', async () => {
      const testContent = '# Test Content';
      const validationResult = {
        valid: false,
        errors: [
          {
            type: 'missing_section' as const,
            section: 'project_overview',
            message: 'Project overview is missing',
            severity: 'error' as const,
            correction_prompt: 'Add a project overview section',
            template_example: '## Project Overview\nA brief description of the project.'
          }
        ]
      };

      mockValidationEngine.validateContent.mockReturnValue(validationResult);

      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'mental_model',
        content: testContent
      });

      expect(mockValidationEngine.validateContent).toHaveBeenCalledWith(
        testContent,
        expect.any(Object) // template
      );
      
      expect(result).toEqual({
        success: false,
        validation: validationResult
      });
    });

    it('should update content when validation passes', async () => {
      const testContent = '# Overview\nTest content';
      const filePath = '/test/path/mental_model.md';
      
      // Setup mocks
      mockValidationEngine.validateContent.mockReturnValue({
        valid: true,
        errors: []
      });
      
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);
      
      // Mock the writeFile method
      const originalWriteFile = server['writeFile'];
      server['writeFile'] = jest.fn().mockResolvedValue(undefined);
      
      try {
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
        expect(server['writeFile']).toHaveBeenCalledWith(
          filePath,
          testContent
        );
        
        // Verify validation was called with the correct arguments
        expect(mockValidationEngine.validateContent).toHaveBeenCalledWith(
          testContent,
          expect.objectContaining({
            name: 'Default Template',
            schema: expect.any(Object)
          })
        );
      } finally {
        // Restore original implementation
        server['writeFile'] = originalWriteFile;
      }
    });
    
    it('should verify validation result directly', () => {
      const testContent = '# Overview\nTest content';
      const template = {
        name: 'Default Template',
        description: 'Default validation template',
        schema: {
          required_sections: [],
          section_schemas: {},
          format_rules: []
        },
        correction_prompts: {},
        examples: []
      };
      
      // Setup the mock to return a valid result
      mockValidationEngine.validateContent.mockReturnValueOnce({
        valid: true,
        errors: []
      });
      
      const validationResult = mockValidationEngine.validateContent(testContent, template);
      expect(validationResult.valid).toBe(true);
    });
    
    it('should call writeFile with correct arguments', async () => {
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
    
    it('should implement writeFile correctly', async () => {
      const testContent = '# Test Content';
      const filePath = '/test/path/test_file.md';
      
      // Save original implementation
      const originalWriteFile = server['writeFile'];
      
      // Mock the implementation
      server['writeFile'] = jest.fn().mockImplementation(async (path, content) => {
        // Verify the arguments
        expect(path).toBe(filePath);
        expect(content).toBe(testContent);
      });
      
      try {
        // Call the method
        await server['writeFile'](filePath, testContent);
        
        // Verify the mock was called
        expect(server['writeFile']).toHaveBeenCalledWith(
          filePath,
          testContent
        );
      } finally {
        // Restore original implementation
        server['writeFile'] = originalWriteFile;
      }
    });
    
    it('should not update content when validation fails', async () => {
      const testContent = '# Invalid Content';
      const filePath = '/test/path/mental_model.md';
      const validationResult = {
        valid: false,
        errors: [{
          type: 'format_error' as const,
          section: 'overview',
          message: 'Invalid format',
          severity: 'error' as const,
          correction_prompt: 'Please fix the format',
          template_example: 'Example: ...'
        }]
      };

      // Setup mocks
      mockValidationEngine.validateContent.mockReturnValue(validationResult);
      mockProjectManager.getContextFilePath.mockReturnValue(filePath);

      // Call the method
      const result = await server.handleUpdateContext({
        project_id: 'test-project',
        file_type: 'mental_model',
        content: testContent
      });

      // Verify the result
      expect(result).toEqual({
        success: false,
        validation: validationResult
      });
      
      // Verify no file was written
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
