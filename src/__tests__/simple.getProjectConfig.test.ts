import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import { jest, describe, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Unmock fs to use real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.getProjectConfig - Basic Test', () => {
  let tempDir: string;
  let helper: FileSystemHelper;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-simple-'));
    helper = new FileSystemHelper(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('creates default config when no file exists', async () => {
    const projectName = 'test-project';
    
    // Ensure projects directory exists
    await fs.mkdir(path.join(tempDir, 'projects', projectName), { recursive: true });
    
    const result = await helper.getProjectConfig(projectName);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.contextTypes).toHaveLength(1);
    expect(result.config?.contextTypes[0].name).toBe('general');
  });
});
