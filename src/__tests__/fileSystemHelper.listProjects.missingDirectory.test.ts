import { jest, describe, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.listProjects - Missing Directory Issue', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-missing-dir-test-'));
    fileSystemHelper = new FileSystemHelper(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  test('FIXED BEHAVIOR: creates projects directory if missing and returns empty array', async () => {
    // Fresh installation - only contextRoot exists, no projects directory
    const projectsDir = path.join(tempDir, 'projects');
    
    // Verify initial state: contextRoot exists but projects directory doesn't
    const contextRootStats = await fs.stat(tempDir);
    expect(contextRootStats.isDirectory()).toBe(true);
    await expect(fs.access(projectsDir)).rejects.toThrow();
    
    // listProjects() now creates the projects directory and succeeds
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    
    // Verify projects directory was created
    const projectsStats = await fs.stat(projectsDir);
    expect(projectsStats.isDirectory()).toBe(true);
  });

  test('works correctly when called multiple times', async () => {
    // First call creates directory and returns empty array
    const result1 = await fileSystemHelper.listProjects();
    expect(result1.success).toBe(true);
    expect(result1.data).toEqual([]);
    
    // Add a project
    await fileSystemHelper.initProject('first-project');
    
    // Second call finds the project
    const result2 = await fileSystemHelper.listProjects();
    expect(result2.success).toBe(true);
    expect(result2.data).toEqual(['first-project']);
  });

  test('creates both contextRoot and projects directories when both are missing', async () => {
    // Test the edge case where both levels need to be created
    
    // Initially, no projects directory exists
    const projectsDir = path.join(tempDir, 'projects');
    await expect(fs.access(projectsDir)).rejects.toThrow();
    
    // listProjects() creates the projects directory and succeeds
    const result = await fileSystemHelper.listProjects();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    
    // Both contextRoot and projects directory should exist
    const contextRootStats = await fs.stat(tempDir);
    expect(contextRootStats.isDirectory()).toBe(true);
    
    const projectsStats = await fs.stat(projectsDir);
    expect(projectsStats.isDirectory()).toBe(true);
  });
});
