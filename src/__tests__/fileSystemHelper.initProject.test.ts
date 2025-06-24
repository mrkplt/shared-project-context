import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.initProject', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;

  // Helper to get consistent projects directory path
  const getProjectsDir = (root: string) => path.join(root, 'projects');

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-initproject-test-'));
    fileSystemHelper = new FileSystemHelper(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  test('creates new project successfully', async () => {
    const projectName = 'basic-project';
    
    const result = await fileSystemHelper.initProject(projectName);
    
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    
    // Verify project directory was created
    const expectedProjectPath = path.join(getProjectsDir(tempDir), projectName);
    const stats = await fs.stat(expectedProjectPath);
    expect(stats.isDirectory()).toBe(true);
  });

  test('creates nested directory structure when projects dir does not exist', async () => {
    const projectName = 'nested-test';
    
    // Verify projects directory doesn't exist initially
    const projectsDir = getProjectsDir(tempDir);
    await expect(fs.access(projectsDir)).rejects.toThrow();
    
    const result = await fileSystemHelper.initProject(projectName);
    
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    
    // Verify full directory structure was created
    const projectDir = path.join(projectsDir, projectName);
    
    const projectsStats = await fs.stat(projectsDir);
    const projectStats = await fs.stat(projectDir);
    
    expect(projectsStats.isDirectory()).toBe(true);
    expect(projectStats.isDirectory()).toBe(true);
  });

  // Test various project name formats
  const validProjectNames = [
    'project-with-hyphens',
    'project_with_underscores', 
    'project.with.dots',
    'ProjectWithCamelCase',
    'project1',
    'PROJECT_CAPS',
    ''  // Documents current behavior: empty name is allowed
  ] as const;

  test.each(validProjectNames)('handles project name "%s"', async (projectName) => {
    const result = await fileSystemHelper.initProject(projectName);
    
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    
    // For empty string, the target is just the projects directory itself
    // For named projects, it's projects/projectName
    const targetPath = projectName 
      ? path.join(getProjectsDir(tempDir), projectName)
      : getProjectsDir(tempDir);
    
    const stats = await fs.stat(targetPath);
    expect(stats.isDirectory()).toBe(true);
  });

  test('fails when project already exists', async () => {
    const projectName = 'duplicate-project';
    
    // Create project first
    const firstResult = await fileSystemHelper.initProject(projectName);
    expect(firstResult.success).toBe(true);
    expect(firstResult.errors).toBeUndefined();
    
    // Second call should fail
    const secondResult = await fileSystemHelper.initProject(projectName);
    expect(secondResult.success).toBe(false);
    expect(secondResult.errors).toEqual([`Project '${projectName}' already exists.`]);
    
    // Verify only one project directory exists
    const entries = await fs.readdir(getProjectsDir(tempDir));
    expect(entries).toEqual([projectName]);
  });

  test('second call with empty name fails', async () => {
    // First call with empty name should succeed
    const firstResult = await fileSystemHelper.initProject('');
    expect(firstResult.success).toBe(true);
    expect(firstResult.errors).toBeUndefined();
    
    // Second call with empty name should fail
    const secondResult = await fileSystemHelper.initProject('');
    expect(secondResult.success).toBe(false);
    expect(secondResult.errors).toEqual([`Project '' already exists.`]);
  });

  test('can create multiple different projects', async () => {
    const projectNames = ['project-one', 'project-two', 'project-three'];
    
    // Create all projects
    for (const projectName of projectNames) {
      const result = await fileSystemHelper.initProject(projectName);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    }
    
    // Verify all projects exist
    for (const projectName of projectNames) {
      const projectPath = path.join(getProjectsDir(tempDir), projectName);
      const stats = await fs.stat(projectPath);
      expect(stats.isDirectory()).toBe(true);
    }
    
    // Verify projects directory contains all of them
    const entries = await fs.readdir(getProjectsDir(tempDir));
    expect(entries.sort()).toEqual(projectNames.sort());
  });

  test('handles concurrent initProject calls gracefully', async () => {
    const projectName = 'concurrent-project';
    
    const [result1, result2] = await Promise.all([
      fileSystemHelper.initProject(projectName),
      fileSystemHelper.initProject(projectName)
    ]);
    
    const successes = [result1, result2].filter(r => r.success);
    const failures = [result1, result2].filter(r => !r.success);
    
    // At least one should succeed
    expect(successes.length).toBeGreaterThanOrEqual(1);
    
    // All successes should have no errors
    successes.forEach(success => {
      expect(success.errors).toBeUndefined();
    });
    
    // Any failures should be "already exists" errors
    failures.forEach(failure => {
      expect(failure.errors).toContain(`Project '${projectName}' already exists.`);
    });
    
    // Verify project was created on disk
    const projectPath = path.join(getProjectsDir(tempDir), projectName);
    const stats = await fs.stat(projectPath);
    expect(stats.isDirectory()).toBe(true);
  });
});
