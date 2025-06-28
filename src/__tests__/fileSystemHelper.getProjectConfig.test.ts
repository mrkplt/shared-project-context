import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Unmock fs to use real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.getProjectConfig', () => {
  let tempDir: string;
  let helper: FileSystemHelper;
  let projectName: string;
  let projectPath: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temporary directory for real filesystem testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-getprojectconfig-'));
    helper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    projectPath = path.join(tempDir, 'projects', projectName);
    configPath = path.join(projectPath, 'project-config.json');
    
    // Ensure projects directory exists
    await fs.mkdir(path.join(tempDir, 'projects'), { recursive: true });
    await fs.mkdir(projectPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('successful config loading and caching', () => {
    test('loads valid config file and returns parsed content', async () => {
      // Create a valid config file
      const validConfig = {
        contextTypes: [
          {
            baseType: "templated-single-document",
            name: "custom",
            description: "Custom context type",
            template: "custom",
            validation: true
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(validConfig, null, 2));

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validConfig);
      expect(result.errors).toBeUndefined();
    });

    test('caches config and avoids subsequent file reads', async () => {
      // Create a valid config file
      const validConfig = {
        contextTypes: [
          {
            baseType: "freeform-document-collection",
            name: "test",
            description: "Test config",
            validation: false
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(validConfig, null, 2));

      // Spy on fs.readFile to verify caching behavior
      const readFileSpy = jest.spyOn(fs, 'readFile');

      // First call should read the file
      const result1 = await helper.getProjectConfig(projectName);
      expect(result1.success).toBe(true);
      expect(readFileSpy).toHaveBeenCalledWith(configPath, 'utf-8');
      
      // Reset the spy call count
      readFileSpy.mockClear();

      // Second call should use cache, not read file
      const result2 = await helper.getProjectConfig(projectName);
      expect(result2.success).toBe(true);
      expect(result2.config).toEqual(validConfig);
      expect(readFileSpy).not.toHaveBeenCalled();

      readFileSpy.mockRestore();
    });
  });

  describe('default config creation when file missing', () => {
    test('creates default config file when project-config.json does not exist', async () => {
      // Ensure config file doesn't exist
      expect(await fileExists(configPath)).toBe(false);

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.contextTypes).toHaveLength(1);
      expect(result.config?.contextTypes[0].name).toBe('general');
      expect(result.config?.contextTypes[0].baseType).toBe('freeform-document-collection');
      
      // Verify file was created on disk
      expect(await fileExists(configPath)).toBe(true);
      
      // Verify file contents match returned config
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const parsedFileContent = JSON.parse(fileContent);
      expect(parsedFileContent).toEqual(result.config);
    });

    test('caches default config after creation', async () => {
      // Spy on fs operations
      const readFileSpy = jest.spyOn(fs, 'readFile');
      const writeFileSpy = jest.spyOn(fs, 'writeFile');

      // First call should create default config
      const result1 = await helper.getProjectConfig(projectName);
      expect(result1.success).toBe(true);
      expect(writeFileSpy).toHaveBeenCalledWith(
        configPath, 
        expect.stringContaining('"general"')
      );
      
      // Clear spy calls
      readFileSpy.mockClear();
      writeFileSpy.mockClear();

      // Second call should use cache, no file operations
      const result2 = await helper.getProjectConfig(projectName);
      expect(result2.success).toBe(true);
      expect(result2.config).toEqual(result1.config);
      expect(readFileSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();

      readFileSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });

  describe('JSON parse error handling', () => {
    test('returns error for malformed JSON', async () => {
      // Create malformed JSON file
      const malformedJson = '{"contextTypes": [{"name": "test",}]}'; // trailing comma
      await fs.writeFile(configPath, malformedJson);

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatch(/Error parsing config file/);
      expect(result.config).toBeUndefined();
    });

    test('returns error for completely invalid JSON', async () => {
      // Create completely invalid JSON
      const invalidJson = 'not json at all {';
      await fs.writeFile(configPath, invalidJson);

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatch(/Error parsing config file/);
    });

    test('handles truncated/incomplete JSON files', async () => {
      // Create truncated JSON (simulates interrupted write)
      const truncatedJson = '{"contextTypes": [{"baseType": "freeform';
      await fs.writeFile(configPath, truncatedJson);

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatch(/Error parsing config file/);
      expect(result.config).toBeUndefined();
    });

    test('does not cache when JSON parsing fails', async () => {
      // Create malformed JSON file
      await fs.writeFile(configPath, '{"invalid": json}');

      // First call should fail
      const result1 = await helper.getProjectConfig(projectName);
      expect(result1.success).toBe(false);

      // Fix the JSON
      const validConfig = { contextTypes: [{ baseType: "freeform-document-collection", name: "fixed", description: "Fixed", validation: false }] };
      await fs.writeFile(configPath, JSON.stringify(validConfig));

      // Second call should succeed and read the file again
      const result2 = await helper.getProjectConfig(projectName);
      expect(result2.success).toBe(true);
      expect(result2.config).toEqual(validConfig);
    });
  });

  describe('file read error handling', () => {
    test('returns error when config file is a directory', async () => {
      // Create a directory with the config file name
      await fs.mkdir(configPath);

      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatch(/Error reading config file/);
    });

    test('returns error for permission denied', async () => {
      // Create config file then make it unreadable
      await fs.writeFile(configPath, '{"test": "content"}');
      await fs.chmod(configPath, 0o000); // No permissions

      try {
        const result = await helper.getProjectConfig(projectName);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0]).toMatch(/Error reading config file/);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(configPath, 0o644);
      }
    });

    test('recovers from parse errors and does not cache failed attempts', async () => {
      // Create malformed JSON file
      await fs.writeFile(configPath, '{"invalid": json}');

      // First call should fail with parse error
      const result1 = await helper.getProjectConfig(projectName);
      expect(result1.success).toBe(false);
      expect(result1.errors?.[0]).toMatch(/Error parsing config file/);
      expect(result1.config).toBeUndefined();

      // Spy on fs.readFile to verify it reads again after fixing
      const readFileSpy = jest.spyOn(fs, 'readFile');
      
      // Fix the JSON file
      const validConfig = {
        contextTypes: [{
          baseType: "freeform-document-collection",
          name: "recovered",
          description: "Recovered from parse error",
          validation: false
        }]
      };
      await fs.writeFile(configPath, JSON.stringify(validConfig));

      // Second call should succeed and read the file again (not use cache)
      const result2 = await helper.getProjectConfig(projectName);
      expect(result2.success).toBe(true);
      expect(result2.config).toEqual(validConfig);
      expect(result2.config?.contextTypes[0].name).toBe('recovered');
      
      // Verify it read the file again (not cached)
      expect(readFileSpy).toHaveBeenCalledWith(configPath, 'utf-8');
      
      readFileSpy.mockRestore();
    });
  });

  describe('default config write failure scenarios', () => {
    test('returns error when directory permissions prevent config access', async () => {
      // Make project directory read-only to prevent file access
      await fs.chmod(projectPath, 0o444); // Read-only

      try {
        const result = await helper.getProjectConfig(projectName);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0]).toMatch(/Error reading config file/);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(projectPath, 0o755);
      }
    });
  });

  describe('edge cases', () => {
    test('different helper instances have isolated caches', async () => {
      // Create two different temp directories and helpers
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'test-cache-isolation-'));
      const helper2 = new FileSystemHelper(tempDir2);
      const projectName2 = 'test-project-2';
      
      try {
        // Set up both projects
        await fs.mkdir(path.join(tempDir, 'projects', projectName), { recursive: true });
        await fs.mkdir(path.join(tempDir2, 'projects', projectName2), { recursive: true });
        
        // Create different configs for each project
        const config1 = {
          contextTypes: [{
            baseType: "templated-single-document",
            name: "config1",
            description: "First config",
            validation: true
          }]
        };
        
        const config2 = {
          contextTypes: [{
            baseType: "freeform-log", 
            name: "config2",
            description: "Second config",
            validation: false
          }]
        };
        
        await fs.writeFile(configPath, JSON.stringify(config1));
        await fs.writeFile(path.join(tempDir2, 'projects', projectName2, 'project-config.json'), JSON.stringify(config2));
        
        // Spy on fs.readFile to verify each helper reads its own file
        const readFileSpy = jest.spyOn(fs, 'readFile');
        
        // Each helper should read its own config
        const result1 = await helper.getProjectConfig(projectName);
        const result2 = await helper2.getProjectConfig(projectName2);
        
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result1.config?.contextTypes[0].name).toBe('config1');
        expect(result2.config?.contextTypes[0].name).toBe('config2');
        
        // Verify both files were read (2 calls to readFile)
        expect(readFileSpy).toHaveBeenCalledTimes(2);
        
        // Reset spy and call again to verify each uses its own cache
        readFileSpy.mockClear();
        
        const cachedResult1 = await helper.getProjectConfig(projectName);
        const cachedResult2 = await helper2.getProjectConfig(projectName2);
        
        expect(cachedResult1.config?.contextTypes[0].name).toBe('config1');
        expect(cachedResult2.config?.contextTypes[0].name).toBe('config2');
        
        // Neither should have read files again (using cache)
        expect(readFileSpy).not.toHaveBeenCalled();
        
        readFileSpy.mockRestore();
      } finally {
        await fs.rm(tempDir2, { recursive: true, force: true });
      }
    });
    test('handles concurrent calls correctly', async () => {
      // Ensure no config file exists
      expect(await fileExists(configPath)).toBe(false);

      // Make concurrent calls
      const [result1, result2] = await Promise.all([
        helper.getProjectConfig(projectName),
        helper.getProjectConfig(projectName)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.config).toEqual(result2.config);
      
      // Verify only one config file was created
      expect(await fileExists(configPath)).toBe(true);
    });

    test('handles very large valid config file', async () => {
      // Create a large but valid config
      const largeConfig = {
        contextTypes: Array.from({ length: 100 }, (_, i) => ({
          baseType: "freeform-document-collection",
          name: `type-${i}`,
          description: `Type ${i} with a very long description `.repeat(10),
          validation: false
        }))
      };
      
      await fs.writeFile(configPath, JSON.stringify(largeConfig, null, 2));

      const startTime = Date.now();
      const result = await helper.getProjectConfig(projectName);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.config?.contextTypes).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('verifies default config structure', async () => {
      const result = await helper.getProjectConfig(projectName);

      expect(result.success).toBe(true);
      expect(result.config).toEqual({
        contextTypes: [{
          baseType: "freeform-document-collection",
          name: "general",
          description: "Arbitrary named contexts with no template requirements. Each document stored separately and requires a filename.",
          validation: false
        }]
      });
    });
  });

  // Helper function to check file existence
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
});