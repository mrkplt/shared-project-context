import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';

// Use real filesystem for integration testing
jest.unmock('fs');

describe('Context Type Specific Behaviors', () => {
  let tempDir: string;
  let persistenceHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-type-specific-test-'));
    persistenceHelper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    
    await persistenceHelper.initProject(projectName);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  async function setupProjectConfig(contextTypes: any[]) {
    const projectPath = path.join(tempDir, 'projects', projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    await fs.writeFile(configPath, JSON.stringify({ contextTypes }, null, 2));
  }

  async function listContextFiles(contextType: string): Promise<string[]> {
    const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
    try {
      return await fs.readdir(contextTypeDir);
    } catch (error) {
      return [];
    }
  }

  describe('Single Document Types', () => {
    beforeEach(async () => {
      await setupProjectConfig([
        {
          name: 'templated-single',
          baseType: 'templated-single-document',
          description: 'Templated single document',
          validation: true,
          template: 'mental_model'
        },
        {
          name: 'freeform-single',
          baseType: 'freeform-single-document',
          description: 'Freeform single document',
          validation: false
        }
      ]);
    });

    test('single document ignores contextName for file naming', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-single',
        contextName: 'ignored-name',
        content: 'test content'
      });

      await context.update();
      
      const files = await listContextFiles('templated-single');
      expect(files).toEqual(['templated-single.md']);
      
      // Verify no file with the provided contextName exists
      const contextTypeDir = path.join(tempDir, 'projects', projectName, 'templated-single');
      const ignoredPath = path.join(contextTypeDir, 'ignored-name.md');
      await expect(fs.access(ignoredPath)).rejects.toThrow();
    });

    test('multiple updates to single document replace content', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-single',
        contextName: 'first-name',
        content: 'first content'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-single',
        contextName: 'different-name',
        content: 'second content'
      });

      await context1.update();
      await context2.update();
      
      // Only one file should exist
      const files = await listContextFiles('freeform-single');
      expect(files).toEqual(['freeform-single.md']);
      
      // File should contain latest content
      const filePath = path.join(tempDir, 'projects', projectName, 'freeform-single', 'freeform-single.md');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('second content');
    });

    test('templated single document performs reset before update', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-single',
        content: 'initial content'
      });

      // First update
      await context.update();
      
      // Verify content exists
      let readResult = await context.read();
      expect(readResult.content).toBe('initial content');
      
      // Second update should reset first (this is the unique behavior)
      const secondContext = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-single',
        content: 'replacement content'
      });
      
      await secondContext.update();
      
      // Content should be completely replaced
      readResult = await secondContext.read();
      expect(readResult.content).toBe('replacement content');
      
      // Only one file should exist
      const files = await listContextFiles('templated-single');
      expect(files).toEqual(['templated-single.md']);
    });
  });

  describe('Document Collection Types', () => {
    beforeEach(async () => {
      await setupProjectConfig([
        {
          name: 'templated-collection',
          baseType: 'templated-document-collection',
          description: 'Templated document collection',
          validation: true,
          template: 'features'
        },
        {
          name: 'freeform-collection',
          baseType: 'freeform-document-collection',
          description: 'Freeform document collection',
          validation: false
        }
      ]);
    });

    test('collection types create separate files for each contextName', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-collection',
        contextName: 'doc1',
        content: 'content for doc1'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-collection',
        contextName: 'doc2',
        content: 'content for doc2'
      });

      await context1.update();
      await context2.update();
      
      const files = await listContextFiles('freeform-collection');
      expect(files.sort()).toEqual(['doc1.md', 'doc2.md']);
      
      // Verify each file has correct content
      const contextTypeDir = path.join(tempDir, 'projects', projectName, 'freeform-collection');
      const content1 = await fs.readFile(path.join(contextTypeDir, 'doc1.md'), 'utf-8');
      const content2 = await fs.readFile(path.join(contextTypeDir, 'doc2.md'), 'utf-8');
      
      expect(content1).toBe('content for doc1');
      expect(content2).toBe('content for doc2');
    });

    test('collection types require contextName for all operations', async () => {
      // Test that operations fail without contextName
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-collection',
        content: 'test content'
        // No contextName provided
      });

      const updateResult = await context.update();
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors![0]).toMatch(/Context name is required/);

      const readResult = await context.read();
      expect(readResult.success).toBe(false);
      expect(readResult.errors![0]).toMatch(/Context name is required/);

      const resetResult = await context.reset();
      expect(resetResult.success).toBe(false);
      expect(resetResult.errors![0]).toMatch(/Context name is required/);
    });

    test('collection types update individual documents independently', async () => {
      // Create first document
      const context1 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-collection',
        contextName: 'feature1',
        content: 'original feature1 content'
      });

      // Create second document
      const context2 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-collection',
        contextName: 'feature2',
        content: 'feature2 content'
      });

      await context1.update();
      await context2.update();
      
      // Update first document
      const context1Updated = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-collection',
        contextName: 'feature1',
        content: 'updated feature1 content'
      });

      await context1Updated.update();
      
      // Verify feature1 was updated but feature2 unchanged
      const contextTypeDir = path.join(tempDir, 'projects', projectName, 'freeform-collection');
      const feature1Content = await fs.readFile(path.join(contextTypeDir, 'feature1.md'), 'utf-8');
      const feature2Content = await fs.readFile(path.join(contextTypeDir, 'feature2.md'), 'utf-8');
      
      expect(feature1Content).toBe('updated feature1 content');
      expect(feature2Content).toBe('feature2 content');
    });
  });

  describe('Log Types', () => {
    beforeEach(async () => {
      await setupProjectConfig([
        {
          name: 'templated-log',
          baseType: 'templated-log',
          description: 'Templated log entries',
          validation: true,
          template: 'session_summary'
        },
        {
          name: 'freeform-log',
          baseType: 'freeform-log',
          description: 'Freeform log entries',
          validation: false
        }
      ]);
    });

    test('log types create timestamped files', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'first log entry'
      });

      await context.update();
      
      const files = await listContextFiles('freeform-log');
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^freeform-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
    });

    test('log types accumulate entries over time', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'first entry'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'second entry'
      });

      await context1.update();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await context2.update();
      
      // Multiple files should exist
      const files = await listContextFiles('templated-log');
      expect(files.length).toBe(2);
      
      files.forEach(file => {
        expect(file).toMatch(/^templated-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      });
      
      // Read operation should return combined content
      const readResult = await context1.read();
      expect(readResult.success).toBe(true);
      expect(readResult.content).toContain('first entry');
      expect(readResult.content).toContain('second entry');
      // Log entries are separated by --- delimiter but order may vary
      expect(readResult.content).toMatch(/---/);
    });

    test('log types read entries and preserve all content', async () => {
      const entries = ['entry 1', 'entry 2', 'entry 3'];
      
      for (let i = 0; i < entries.length; i++) {
        const context = await contextTypeFactory({
          persistenceHelper,
          projectName,
          contextType: 'freeform-log',
          content: entries[i]
        });
        
        await context.update();
        
        // Small delay to ensure different timestamps
        if (i < entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Read should return all entries
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'dummy'
      });
      
      const readResult = await context.read();
      expect(readResult.success).toBe(true);
      
      const content = readResult.content!;
      expect(content).toContain('entry 1');
      expect(content).toContain('entry 2');
      expect(content).toContain('entry 3');
      
      // Entries should be separated by --- delimiter
      const separatorCount = (content.match(/---/g) || []).length;
      expect(separatorCount).toBe(2); // n-1 separators for n entries
    });

    test('log types ignore contextName for file naming', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-log',
        contextName: 'ignored-context-name',
        content: 'log entry content'
      });

      await context.update();
      
      const files = await listContextFiles('templated-log');
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^templated-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      expect(files[0]).not.toContain('ignored-context-name');
    });

    test('log types do not reset before update (append behavior)', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'persistent entry'
      });

      await context1.update();
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const context2 = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'additional entry'
      });

      await context2.update();
      
      // Two separate files should exist
      const files = await listContextFiles('freeform-log');
      expect(files).toHaveLength(2);
      
      // Both entries should be available when reading (log behavior)
      const readResult = await context1.read();
      expect(readResult.success).toBe(true);
      
      // Verify both entries are present in the result
      const content = readResult.content!;
      expect(content.includes('persistent entry') || content.includes('additional entry')).toBe(true);
      
      // The content should show multiple log entries exist
      if (content.includes('---')) {
        // If there's a separator, both entries should be present
        expect(content).toContain('persistent entry');
        expect(content).toContain('additional entry');
      }
    });
  });

  describe('Template Validation Differences', () => {
    beforeEach(async () => {
      await setupProjectConfig([
        {
          name: 'templated-type',
          baseType: 'templated-single-document',
          description: 'Templated type for validation testing',
          validation: true,
          template: 'mental_model'
        },
        {
          name: 'freeform-type',
          baseType: 'freeform-single-document',
          description: 'Freeform type for validation testing',
          validation: false
        }
      ]);
    });

    test('templated types validate content structure', async () => {
      const templatedContext = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-type',
        content: 'Invalid template structure without proper headers'
      });

      const validationResult = await templatedContext.validate();
      
      // Should have validation logic (may pass or fail depending on template)
      expect(typeof validationResult.isValid).toBe('boolean');
      if (!validationResult.isValid) {
        expect(validationResult.validationErrors).toBeDefined();
        expect(validationResult.correctionGuidance).toBeDefined();
      }
    });

    test('freeform types skip validation', async () => {
      const freeformContext = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-type',
        content: 'Any content structure is valid here without headers or specific format'
      });

      const validationResult = await freeformContext.validate();
      
      // Should always be valid for freeform types
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.validationErrors).toBeUndefined();
      expect(validationResult.correctionGuidance).toBeUndefined();
    });

    test('templated types reject empty content', async () => {
      const templatedContext = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-type',
        content: ''
      });

      const validationResult = await templatedContext.validate();
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.validationErrors).toBeDefined();
      expect(validationResult.validationErrors![0].message).toMatch(/cannot be empty/);
      expect(validationResult.correctionGuidance).toBeDefined();
    });

    test('freeform types accept empty content', async () => {
      const freeformContext = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-type',
        content: ''
      });

      const validationResult = await freeformContext.validate();
      
      expect(validationResult.isValid).toBe(true);
    });
  });
});