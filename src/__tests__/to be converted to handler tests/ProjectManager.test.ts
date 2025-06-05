// Mock path module
const mockPath = {
  join: (...args: string[]) => args.join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  isAbsolute: (p: string) => p.startsWith('/'),
  resolve: (...args: string[]) => args.join('/'),
  sep: '/',
  delimiter: ':',
  normalize: (p: string) => p,
  relative: (from: string, to: string) => to,
  toNamespacedPath: (p: string) => p,
  parse: (p: string) => ({
    root: '/',
    dir: '/',
    base: p,
    ext: '',
    name: p,
  }),
  format: (p: any) => p.base || '',
};

jest.mock('path', () => mockPath);

// Mock os module
const mockOs = {
  homedir: jest.fn().mockReturnValue('/home/user')
};

jest.mock('os', () => mockOs);

import { ProjectManager } from '../../project/ProjectManager';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
}));

const mockMkdir = require('fs/promises').mkdir as jest.Mock;
const mockWriteFile = require('fs/promises').writeFile as jest.Mock;
const mockAccess = require('fs/promises').access as jest.Mock;
const mockReadFile = require('fs/promises').readFile as jest.Mock;
const mockReaddir = require('fs/promises').readdir as jest.Mock;

describe('ProjectManager', () => {
  let projectManager: ProjectManager;
  const testProjectPath = '/test/project/path';
  const testProjectId = 'test-project-123';
  const testContextRoot = '/test/context/root';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock implementation
    mockOs.homedir.mockReturnValue('/home/user');
    
    // Create a new instance for each test
    projectManager = new ProjectManager();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initProject', () => {
    it('should create project directory if it does not exist', async () => {
      const projectPath = '/path/to/project';
      const projectId = 'test-project';
      const expectedContextPath = '/home/user/.shared-project-context/projects/test-project';
      
      // Mock the path.basename to return our test project ID
      jest.spyOn(mockPath, 'basename').mockReturnValue(projectId);
      
      // First call to access should fail (directory doesn't exist)
      mockAccess.mockRejectedValueOnce(new Error('Not found'));
      
      // Call the method
      const result = await projectManager.initProject(projectPath);
      
      // Verify the result
      expect(result).toBe(projectId);
      
      // Verify the directory was created with the correct path
      expect(mockMkdir).toHaveBeenCalledWith(
        expectedContextPath,
        { recursive: true }
      );
    });
    
    it('should return existing project ID if directory already exists', async () => {
      const projectPath = '/path/to/existing/project';
      const projectId = 'existing-project';
      
      // Mock the path.basename to return our test project ID
      jest.spyOn(mockPath, 'basename').mockReturnValue(projectId);
      
      // First call to access should succeed (directory exists)
      mockAccess.mockResolvedValue(undefined);
      
      // Call the method
      const result = await projectManager.initProject(projectPath);
      
      // Verify the result
      expect(result).toBe(projectId);
      
      // Verify no directory was created
      expect(mockMkdir).not.toHaveBeenCalled();
    });
    
    it('should handle errors during directory creation', async () => {
      const projectPath = '/path/to/error/project';
      const projectId = 'error-project';
      const error = new Error('Failed to create directory');
      
      // Mock the path.basename to return our test project ID
      jest.spyOn(mockPath, 'basename').mockReturnValue(projectId);
      
      // First call to access should fail (directory doesn't exist)
      mockAccess.mockRejectedValueOnce(new Error('Not found'));
      
      // Mock mkdir to throw an error
      mockMkdir.mockRejectedValueOnce(error);
      
      // Call the method and expect it to throw
      await expect(projectManager.initProject(projectPath))
        .rejects
        .toThrow('Failed to create directory');
    });
  });

  describe('getContextFilePath', () => {
    it('should return correct file path for context type', async () => {
      const projectId = 'test-project';
      const contextType = 'mental_model';
      const expectedPath = '/home/user/.shared-project-context/projects/test-project/mental_model.md';
      
      // Mock access to simulate project exists
      mockAccess.mockResolvedValue(undefined);
      
      // Call the method
      const result = await projectManager.getContextFilePath(projectId, contextType);
      
      // Verify the result
      expect(result).toBe(expectedPath);
      
      // Verify access was called with the correct path
      expect(mockAccess).toHaveBeenCalledWith(
        '/home/user/.shared-project-context/projects/test-project'
      );
    });
    
    it('should throw for non-existent project', async () => {
      const projectId = 'nonexistent-project';
      const contextType = 'mental_model';
      
      // Mock access to throw an error
      mockAccess.mockRejectedValue(new Error('Not found'));
      
      // Call the method and expect it to throw
      await expect(projectManager.getContextFilePath(projectId, contextType))
        .rejects
        .toThrow(`Project not found: ${projectId}`);
    });
    
    it('should handle access errors appropriately', async () => {
      const projectId = 'error-project';
      const contextType = 'mental_model';
      const error = new Error('Permission denied');
      
      // Mock access to throw a permission error
      mockAccess.mockRejectedValue(error);
      
      // Call the method and expect it to throw with the project not found message
      // since we don't expose filesystem errors directly
      await expect(projectManager.getContextFilePath(projectId, contextType))
        .rejects
        .toThrow(`Project not found: ${projectId}`);
    });
  });

  describe('getContextRoot', () => {
    it('should return the correct context root path', () => {
      // Set up the expected path
      const expectedPath = '/home/user/.shared-project-context';
      
      // Call the method
      const result = projectManager.getContextRoot();
      
      // Verify the result
      expect(result).toBe(expectedPath);
      
      // Verify homedir was called
      expect(mockOs.homedir).toHaveBeenCalled();
    });
    
    it('should return a valid path', () => {
      // Call the method
      const result = projectManager.getContextRoot();
      
      // Verify the result is a non-empty string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // Verify it contains the expected directory name
      expect(result).toContain('.shared-project-context');
    });
  });
});
