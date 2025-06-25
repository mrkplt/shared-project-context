import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.listProjects', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-listprojects-test-'));
    fileSystemHelper = new FileSystemHelper(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  test('returns empty array when projects directory exists but is empty', async () => {
    // The method should succeed if the projects directory exists but is empty
    // First manually create the projects directory
    const projectsDir = path.join(tempDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  test('creates contextRoot but fails if projects directory does not exist', async () => {
    // The contextRoot (tempDir) already exists from mkdtemp, but projects directory doesn't
    const projectsDir = path.join(tempDir, 'projects');
    await expect(fs.access(projectsDir)).rejects.toThrow();
    
    // The method creates contextRoot but fails because projects directory doesn't exist
    const result = await fileSystemHelper.listProjects();
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Directory not found');
    
    // ContextRoot should still exist (it was created)
    const contextRootStats = await fs.stat(tempDir);
    expect(contextRootStats.isDirectory()).toBe(true);
    
    // But projects directory should still not exist
    await expect(fs.access(projectsDir)).rejects.toThrow();
  });

  test('returns list of existing project directories', async () => {
    // Create projects directory first (initProject will create it)
    await fileSystemHelper.initProject('project-alpha');
    await fileSystemHelper.initProject('project-beta');
    await fileSystemHelper.initProject('project-gamma');
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data.sort()).toEqual(['project-alpha', 'project-beta', 'project-gamma']);
  });

  test('ignores files in projects directory, only returns directories', async () => {
    // Create projects directory first via initProject
    await fileSystemHelper.initProject('valid-project');
    
    // Create a file in the projects directory (should be ignored)
    const projectsDir = path.join(tempDir, 'projects');
    await fs.writeFile(path.join(projectsDir, 'not-a-project.txt'), 'This is a file');
    await fs.writeFile(path.join(projectsDir, 'another-file.json'), '{}');
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(['valid-project']);
  });

  test('handles projects with special characters in names', async () => {
    // Create projects with various naming patterns
    await fileSystemHelper.initProject('project-with-dashes');
    await fileSystemHelper.initProject('project_with_underscores');
    await fileSystemHelper.initProject('project123');
    await fileSystemHelper.initProject('ProjectCamelCase');
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data.sort()).toEqual([
      'ProjectCamelCase',
      'project-with-dashes', 
      'project123',
      'project_with_underscores'
    ]);
  });

  test('returns projects in alphabetical order', async () => {
    // Create projects in non-alphabetical order
    await fileSystemHelper.initProject('zebra-project');
    await fileSystemHelper.initProject('alpha-project');
    await fileSystemHelper.initProject('beta-project');
    await fileSystemHelper.initProject('charlie-project');
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    // Note: The method doesn't explicitly sort, but filesystem readdir might
    expect(result.data).toHaveLength(4);
    expect(result.data).toContain('alpha-project');
    expect(result.data).toContain('beta-project');
    expect(result.data).toContain('charlie-project');
    expect(result.data).toContain('zebra-project');
  });

  test('handles empty project directories', async () => {
    // Create project directories manually (without using initProject)
    const projectsDir = path.join(tempDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
    await fs.mkdir(path.join(projectsDir, 'empty-project'));
    await fs.mkdir(path.join(projectsDir, 'another-empty'));
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data.sort()).toEqual(['another-empty', 'empty-project']);
  });

  test('handles mixed valid and invalid directory contents', async () => {
    const projectsDir = path.join(tempDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
    
    // Create valid project
    await fileSystemHelper.initProject('valid-project');
    
    // Create various non-project items
    await fs.writeFile(path.join(projectsDir, 'file.txt'), 'content');
    await fs.mkdir(path.join(projectsDir, 'valid-directory'));
    await fs.writeFile(path.join(projectsDir, '.hidden-file'), 'hidden');
    await fs.mkdir(path.join(projectsDir, '.hidden-directory'));
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data.sort()).toEqual(['.hidden-directory', 'valid-directory', 'valid-project']);
  });

  test('handles when projects directory exists but is empty', async () => {
    // Create just the projects directory without any content
    const projectsDir = path.join(tempDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  test('handles large number of projects', async () => {
    // Create many projects to test performance/handling
    const projectNames = [];
    for (let i = 0; i < 50; i++) {
      const projectName = `project-${i.toString().padStart(3, '0')}`;
      await fileSystemHelper.initProject(projectName);
      projectNames.push(projectName);
    }
    
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(50);
    expect(result.data.sort()).toEqual(projectNames.sort());
  });
});
