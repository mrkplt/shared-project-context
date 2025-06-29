import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import { ContextType } from '../types.js';

// Use real filesystem for integration testing
jest.unmock('fs');

interface ContextTypeScenario {
  name: string;
  baseType: string;
  requiresTemplate: boolean;
  requiresContextName: boolean;
  expectedFilePattern: RegExp;
  behaviorType: 'replace' | 'collection' | 'append';
  template?: string;
}

const contextTypeScenarios: ContextTypeScenario[] = [
  {
    name: 'templated-single-document',
    baseType: 'templated-single-document',
    requiresTemplate: true,
    requiresContextName: false,
    expectedFilePattern: /^templated-single-document\.md$/,
    behaviorType: 'replace',
    template: 'mental_model'
  },
  {
    name: 'freeform-single-document',
    baseType: 'freeform-single-document',
    requiresTemplate: false,
    requiresContextName: false,
    expectedFilePattern: /^freeform-single-document\.md$/,
    behaviorType: 'replace'
  },
  {
    name: 'templated-document-collection',
    baseType: 'templated-document-collection',
    requiresTemplate: true,
    requiresContextName: true,
    expectedFilePattern: /^.+\.md$/,
    behaviorType: 'collection',
    template: 'features'
  },
  {
    name: 'freeform-document-collection',
    baseType: 'freeform-document-collection',
    requiresTemplate: false,
    requiresContextName: true,
    expectedFilePattern: /^.+\.md$/,
    behaviorType: 'collection'
  },
  {
    name: 'templated-log',
    baseType: 'templated-log',
    requiresTemplate: true,
    requiresContextName: false,
    expectedFilePattern: /^templated-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/,
    behaviorType: 'append',
    template: 'session_summary'
  },
  {
    name: 'freeform-log',
    baseType: 'freeform-log',
    requiresTemplate: false,
    requiresContextName: false,
    expectedFilePattern: /^freeform-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/,
    behaviorType: 'append'
  }
];

describe.each(contextTypeScenarios)('$name shared behavior', (scenario) => {
  let tempDir: string;
  let persistenceHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `context-type-shared-test-${scenario.name}-`));
    persistenceHelper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    
    // Initialize project
    await persistenceHelper.initProject(projectName);
    
    // Setup project configuration for this scenario
    const projectPath = path.join(tempDir, 'projects', projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    
    const config = {
      contextTypes: [
        {
          name: scenario.name,
          baseType: scenario.baseType,
          description: `Test ${scenario.name}`,
          validation: scenario.requiresTemplate,
          ...(scenario.template && { template: scenario.template })
        }
      ]
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  async function createTestContext(content: string = 'test content', contextName?: string): Promise<ContextType> {
    const factoryArgs: any = {
      persistenceHelper,
      projectName,
      contextType: scenario.name,
      content
    };

    if (scenario.requiresContextName || contextName) {
      factoryArgs.contextName = contextName || 'test-context';
    }

    return await contextTypeFactory(factoryArgs);
  }

  async function listContextFiles(): Promise<string[]> {
    const contextTypeDir = path.join(tempDir, 'projects', projectName, scenario.name);
    try {
      return await fs.readdir(contextTypeDir);
    } catch (error) {
      return []; // Directory doesn't exist yet
    }
  }

  describe('Basic Operations', () => {
    test('update creates file successfully', async () => {
      const content = `Test content for ${scenario.name}`;
      const context = await createTestContext(content);
      
      const updateResult = await context.update();
      expect(updateResult.success).toBe(true);
      expect(updateResult.errors).toBeUndefined();
      
      // Verify file was created
      const files = await listContextFiles();
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toMatch(scenario.expectedFilePattern);
    });

    test('read returns empty content when no files exist', async () => {
      const context = await createTestContext();
      
      const readResult = await context.read();
      // Most context types will have empty content when no files exist, but still succeed
      // However some may fail - we need to check the actual behavior
      if (readResult.success) {
        expect(readResult.content).toBe('');
      } else {
        // If it fails, it should have errors indicating context not found
        expect(readResult.errors).toBeDefined();
        expect(readResult.errors![0]).toMatch(/not found|Context not found|does not exist|Unknown error/);
      }
    });

    test('update then read returns same content', async () => {
      const content = `Test content for ${scenario.name} update-read cycle`;
      const context = await createTestContext(content);
      
      await context.update();
      const readResult = await context.read();
      
      expect(readResult.success).toBe(true);
      expect(readResult.content).toEqual(content);
    });

    test('reset clears context appropriately', async () => {
      const context = await createTestContext('content to be reset');
      
      // Create content first
      await context.update();
      const filesBeforeReset = await listContextFiles();
      expect(filesBeforeReset.length).toBeGreaterThan(0);
      
      // Reset
      const resetResult = await context.reset();
      expect(resetResult.success).toBe(true);
      
      // Verify files are cleared
      const filesAfterReset = await listContextFiles();
      expect(filesAfterReset).toEqual([]);
    });
  });

  describe('Content Handling', () => {
    test('handles empty content', async () => {
      const context = await createTestContext('');
      
      const updateResult = await context.update();
      // All context types treat empty string as falsy and require content
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors![0]).toMatch(/Content is required/);
    });

    test('handles multiline content', async () => {
      const content = `Line 1 for ${scenario.name}
Line 2 with details
Line 3 with more content`;
      
      const context = await createTestContext(content);
      
      await context.update();
      const readResult = await context.read();
      
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe(content);
    });

    test('handles special characters in content', async () => {
      const content = `Special chars: àáâãäåæçèéêë ñòóôõöø ùúûüý ÿ €£¥¢ «»‹› ""'' ‚„ †‡ ‰ • ™ ©®`;
      
      const context = await createTestContext(content);
      
      await context.update();
      const readResult = await context.read();
      
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe(content);
    });
  });

  describe('Error Scenarios', () => {
    test('update without content returns error', async () => {
      const factoryArgs: any = {
        persistenceHelper,
        projectName,
        contextType: scenario.name
        // No content provided
      };

      if (scenario.requiresContextName) {
        factoryArgs.contextName = 'test-context';
      }

      const context = await contextTypeFactory(factoryArgs);
      
      const updateResult = await context.update();
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors).toBeDefined();
      expect(updateResult.errors![0]).toMatch(/Content is required/);
    });

    if (scenario.requiresContextName) {
      test('operations without contextName return error', async () => {
        const context = await contextTypeFactory({
          persistenceHelper,
          projectName,
          contextType: scenario.name,
          content: 'test content'
          // No contextName provided
        });
        
        const updateResult = await context.update();
        expect(updateResult.success).toBe(false);
        expect(updateResult.errors).toBeDefined();
        expect(updateResult.errors![0]).toMatch(/Context name is required/);
        
        const readResult = await context.read();
        expect(readResult.success).toBe(false);
        expect(readResult.errors).toBeDefined();
        expect(readResult.errors![0]).toMatch(/Context name is required/);
        
        const resetResult = await context.reset();
        expect(resetResult.success).toBe(false);
        expect(resetResult.errors).toBeDefined();
        expect(resetResult.errors![0]).toMatch(/Context name is required/);
      });
    }
  });

  describe('Validation Behavior', () => {
    test('validate method returns appropriate response', async () => {
      const content = scenario.requiresTemplate 
        ? `# ${scenario.name.charAt(0).toUpperCase() + scenario.name.slice(1)} Template\n\nTest content`
        : 'any content is valid for freeform types';
        
      const context = await createTestContext(content);
      
      const validationResult = await context.validate();
      
      if (scenario.requiresTemplate) {
        // Templated types may have validation logic
        expect(typeof validationResult.isValid).toBe('boolean');
        if (!validationResult.isValid) {
          expect(validationResult.validationErrors).toBeDefined();
          expect(validationResult.correctionGuidance).toBeDefined();
        }
      } else {
        // Freeform types should always be valid
        expect(validationResult.isValid).toBe(true);
      }
    });

    test('validate with empty content handles appropriately', async () => {
      const context = await createTestContext('');
      
      const validationResult = await context.validate();
      
      if (scenario.requiresTemplate) {
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.validationErrors).toBeDefined();
        expect(validationResult.correctionGuidance).toBeDefined();
      } else {
        expect(validationResult.isValid).toBe(true);
      }
    });
  });

  describe('Multiple Operations', () => {
    test('multiple updates behave consistently', async () => {
      const context = await createTestContext('first content');
      
      // First update
      await context.update();
      const firstRead = await context.read();
      expect(firstRead.content).toBe('first content');
      
      // Wait a moment to ensure different timestamps for log types
      if (scenario.behaviorType === 'append') {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Second update with different content - use same context for log types
      if (scenario.behaviorType === 'append') {
        // For log types, use the same context instance so we get all entries
        const secondContext = await createTestContext('second content');
        await secondContext.update();
        const secondRead = await context.read(); // Read using original context
        
        // Log types should accumulate content
        expect(secondRead.content).toContain('first content');
        expect(secondRead.content).toContain('second content');
      } else {
        // For other types, create new context as before
        const secondContext = await createTestContext('second content');
        await secondContext.update();
        const secondRead = await secondContext.read();
        
        if (scenario.behaviorType === 'replace') {
          // Single document types should replace content
          expect(secondRead.content).toBe('second content');
          expect(secondRead.content).not.toContain('first content');
        } else if (scenario.behaviorType === 'collection') {
          // Collection types depend on context name
          if (scenario.requiresContextName) {
            // Same context name should replace, different should add new file
            expect(secondRead.content).toBe('second content');
          }
        }
      }
    });

    test('reset after multiple updates clears all content', async () => {
      const context1 = await createTestContext('content 1');
      await context1.update();
      
      const context2 = await createTestContext('content 2');
      await context2.update();
      
      // Verify content exists
      const readBeforeReset = await context1.read();
      expect(readBeforeReset.content).toBeTruthy();
      
      // Reset
      const resetResult = await context1.reset();
      expect(resetResult.success).toBe(true);
      
      // Verify all content is cleared
      const readAfterReset = await context1.read();
      if (readAfterReset.success) {
        expect(readAfterReset.content).toBe('');
      } else {
        // After reset, reading may fail with "not found" which is also acceptable
        expect(readAfterReset.errors).toBeDefined();
      }
      
      const files = await listContextFiles();
      expect(files).toEqual([]);
    });
  });

  describe('File System Integration', () => {
    test('creates context type directory when needed', async () => {
      const contextTypeDir = path.join(tempDir, 'projects', projectName, scenario.name);
      
      // Verify directory doesn't exist initially
      await expect(fs.access(contextTypeDir)).rejects.toThrow();
      
      const context = await createTestContext('test content');
      await context.update();
      
      // Verify directory was created
      const stats = await fs.stat(contextTypeDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('file names follow expected pattern', async () => {
      const context = await createTestContext('test content');
      await context.update();
      
      const files = await listContextFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(scenario.expectedFilePattern);
    });
  });
});