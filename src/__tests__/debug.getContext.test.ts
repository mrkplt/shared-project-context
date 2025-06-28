import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.getContext - Debug', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-debug-test-'));
    fileSystemHelper = new FileSystemHelper(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  test('debug: what happens with nonexistent project', async () => {
    const result = await fileSystemHelper.getContext('nonexistent', 'general');
    expect(result).toMatchObject({
      success: false,
      errors: ["getContext: Failed to load project configuration."]
    });
  });

  test('debug: what happens with missing file in existing project', async () => {
    // Create project first
    await fileSystemHelper.initProject('test-project');
    
    const result = await fileSystemHelper.getContext('test-project', 'general', ['missing']);
    
    // Let's check what error we actually get
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain('missing.md:');
  });

  test('debug: what happens with templated type missing file', async () => {
    const projectName = 'test-project';
    await fileSystemHelper.initProject(projectName);
    
    // Create custom config with templated type
    const projectPath = path.join(tempDir, 'projects', projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    
    const customConfig = {
      contextTypes: [
        {
          name: 'mental-model',
          baseType: 'templated-single-document',
          description: 'Technical architecture understanding',
          validation: true,
          template: 'mental_model'
        }
      ]
    };
    
    await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    
    const result = await fileSystemHelper.getContext(projectName, 'mental-model', ['missing']);
    
    // Should this succeed with empty content or fail?
    if (result.success) {
      expect(result.data).toEqual(['']);
    } else {
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('mental-model.md:');
    }
  });
});
