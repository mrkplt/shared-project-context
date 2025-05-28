// Define mockPath first
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

// Now mock the modules
jest.mock('path', () => mockPath);

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
    
    // Mock project ID generation
    jest.spyOn(ProjectManager.prototype as any, 'generateProjectId')
      .mockReturnValue(testProjectId);

    projectManager = new ProjectManager(testContextRoot);
  });

  describe('initProject', () => {
    it('should create project directory structure', async () => {
      mockAccess.mockRejectedValue(new Error('Not found')); // Simulate directory doesn't exist
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      
      const projectId = await projectManager.initProject(testProjectPath);

      expect(projectId).toBe(testProjectId);
      
      // Verify project directory was created
      expect(mockMkdir).toHaveBeenCalledWith(
        `${testContextRoot}/projects/${testProjectId}`,
        { recursive: true }
      );
      
      // Verify templates directory was created
      expect(mockMkdir).toHaveBeenCalledWith(
        `${testContextRoot}/projects/${testProjectId}/templates`,
        { recursive: true }
      );
      
      // Verify default template was written
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('default.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should return existing project ID if already initialized', async () => {
      mockAccess.mockResolvedValue(undefined); // Simulate directory exists
      
      const projectId = await projectManager.initProject(testProjectPath);
      
      expect(projectId).toBe(testProjectId);
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });

  describe('getContextFilePath', () => {
    it('should return correct file path for context type', () => {
      const projectId = 'test-project';
      const contextType = 'mental_model';
      
      // Add the project to the projects map
      (projectManager as any).projects.set(projectId, {
        id: projectId,
        name: 'Test Project',
        path: '/test/path',
        contextPath: `${testContextRoot}/projects/${projectId}`,
        templates: {}
      });

      const result = projectManager.getContextFilePath(projectId, contextType);

      expect(result).toBe(`${testContextRoot}/projects/${projectId}/${contextType}.md`);
    });

    it('should throw for unknown project ID', () => {
      const unknownProjectId = 'unknown-project';
      const contextType = 'mental_model';

      expect(() => {
        projectManager.getContextFilePath(unknownProjectId, contextType);
      }).toThrow(`Project not found: ${unknownProjectId}`);
    });
  });

  describe('loadTemplates', () => {
    it('should load and validate templates', async () => {
      const templatesDir = '/test/templates';
      const templateFiles = ['template1.json', 'template2.json'];
      const template1 = { 
        name: 'template1', 
        description: 'Test template 1',
        schema: { 
          required_sections: [],
          section_schemas: {},
          format_rules: []
        },
        correction_prompts: {}
      };
      const template2 = { 
        name: 'template2',
        description: 'Test template 2',
        schema: { 
          required_sections: [],
          section_schemas: {},
          format_rules: []
        },
        correction_prompts: {}
      };

      // Mock the implementation to return template files
      mockReaddir.mockResolvedValue(templateFiles);
      
      // Mock readFile to return different content based on the file name
      mockReadFile.mockImplementation((filePath) => {
        if (filePath.endsWith('template1.json')) {
          return Promise.resolve(JSON.stringify(template1));
        } else if (filePath.endsWith('template2.json')) {
          return Promise.resolve(JSON.stringify(template2));
        }
        return Promise.reject(new Error('File not found'));
      });

      const templates = await (projectManager as any).loadTemplates(templatesDir);

      // Verify the templates were loaded correctly
      expect(templates).toEqual({
        template1: expect.objectContaining({ name: 'template1' }),
        template2: expect.objectContaining({ name: 'template2' })
      });
    });
  });
});
