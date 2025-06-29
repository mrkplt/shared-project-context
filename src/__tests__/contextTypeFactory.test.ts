import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import { TemplatedSingleDocument } from '../models/context_types/templatedSingleDocument.js';
import { FreeformSingleDocument } from '../models/context_types/freeformSingleDocument.js';
import { TemplatedDocumentCollection } from '../models/context_types/templatedDocumentCollection.js';
import { FreeformDocumentCollection } from '../models/context_types/freeformDocumentCollection.js';
import { TemplatedLog } from '../models/context_types/templatedLog.js';
import { FreeformLog } from '../models/context_types/freeformLog.js';

// Use real filesystem for integration testing
jest.unmock('fs');

describe('contextTypeFactory', () => {
  let tempDir: string;
  let persistenceHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-type-factory-test-'));
    persistenceHelper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    
    // Initialize project with all 6 context types
    await persistenceHelper.initProject(projectName);
    
    // Setup project configuration with all context types
    const projectPath = path.join(tempDir, 'projects', projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    
    const allTypesConfig = {
      contextTypes: [
        {
          name: 'templated-single-document',
          baseType: 'templated-single-document',
          description: 'Templated single document',
          validation: true,
          template: 'mental_model'
        },
        {
          name: 'freeform-single-document',
          baseType: 'freeform-single-document',
          description: 'Freeform single document',
          validation: false
        },
        {
          name: 'templated-document-collection',
          baseType: 'templated-document-collection',
          description: 'Templated document collection',
          validation: true,
          template: 'features'
        },
        {
          name: 'freeform-document-collection',
          baseType: 'freeform-document-collection',
          description: 'Freeform document collection',
          validation: false
        },
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
      ]
    };
    
    await fs.writeFile(configPath, JSON.stringify(allTypesConfig, null, 2));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  describe('Context Type Instantiation', () => {
    test('creates TemplatedSingleDocument instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-single-document',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedSingleDocument);
      expect(context.persistenceHelper).toBe(persistenceHelper);
    });

    test('creates FreeformSingleDocument instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(FreeformSingleDocument);
    });

    test('creates TemplatedDocumentCollection instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-document-collection',
        contextName: 'test-feature',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedDocumentCollection);
    });

    test('creates FreeformDocumentCollection instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'test-doc',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(FreeformDocumentCollection);
    });

    test('creates TemplatedLog instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedLog);
    });

    test('creates FreeformLog instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(FreeformLog);
    });
  });

  describe('Error Handling', () => {
    test('throws error for unknown context type', async () => {
      await expect(contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'unknown-type',
        content: 'test content'
      })).rejects.toThrow('Unknown context type: unknown-type');
    });

    test('throws error for unknown base type', async () => {
      // Add a context type with invalid base type to configuration
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const invalidConfig = {
        contextTypes: [
          {
            name: 'invalid-context',
            baseType: 'unknown-base-type',
            description: 'Invalid context type',
            validation: false
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      await expect(contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'invalid-context',
        content: 'test content'
      })).rejects.toThrow('Unknown base type: unknown-base-type');
    });

    test('throws error for nonexistent project', async () => {
      await expect(contextTypeFactory({
        persistenceHelper,
        projectName: 'nonexistent-project',
        contextType: 'templated-single-document',
        content: 'test content'
      })).rejects.toThrow(/Failed to load project configuration/);
    });

    test('throws error when project directory does not exist', async () => {
      // Test with a project that was never created
      const nonExistentProject = 'never-created-project';

      await expect(contextTypeFactory({
        persistenceHelper,
        projectName: nonExistentProject,
        contextType: 'general', // Use default context type
        content: 'test content'
      })).rejects.toThrow(/Failed to load project configuration/);
    });
  });

  describe('Parameter Passing', () => {
    test('passes all parameters to context type constructor', async () => {
      const contextName = 'test-context';
      const content = 'test content for parameter passing';

      const context = await contextTypeFactory({
        persistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName,
        content
      });

      // Verify parameters were passed correctly by testing update operation
      const updateResult = await context.update();
      expect(updateResult.success).toBe(true);

      // Verify file was created with correct content
      const expectedPath = path.join(tempDir, 'projects', projectName, 'freeform-document-collection', `${contextName}.md`);
      const writtenContent = await fs.readFile(expectedPath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('handles optional parameters correctly', async () => {
      // Create a new project that will get default configuration
      const defaultProjectName = 'default-config-project';
      await persistenceHelper.initProject(defaultProjectName);
      
      // Test factory with minimal parameters - use default 'general' context type
      const context = await contextTypeFactory({
        persistenceHelper,
        projectName: defaultProjectName,
        contextType: 'general'
        // No contextName or content
      });

      expect(context).toBeInstanceOf(FreeformDocumentCollection);
      
      // Verify read operation works even without content (should return empty)
      const readResult = await context.read();
      // This will fail because general (freeform-document-collection) requires contextName
      expect(readResult.success).toBe(false);
      expect(readResult.errors![0]).toMatch(/Context name is required/);
    });
  });

  describe('Configuration Integration', () => {
    test('uses project-specific configuration correctly', async () => {
      // Create a project with custom context type names
      const customProjectName = 'custom-project';
      await persistenceHelper.initProject(customProjectName);
      
      const customProjectPath = path.join(tempDir, 'projects', customProjectName);
      const customConfigPath = path.join(customProjectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'my-custom-notes',
            baseType: 'freeform-single-document',
            description: 'Custom notes context',
            validation: false
          },
          {
            name: 'my-custom-features',
            baseType: 'templated-document-collection',
            description: 'Custom features context',
            validation: true,
            template: 'features'
          }
        ]
      };
      
      await fs.writeFile(customConfigPath, JSON.stringify(customConfig, null, 2));

      // Test custom context type creation
      const notesContext = await contextTypeFactory({
        persistenceHelper,
        projectName: customProjectName,
        contextType: 'my-custom-notes',
        content: 'custom notes content'
      });

      expect(notesContext).toBeInstanceOf(FreeformSingleDocument);

      const featuresContext = await contextTypeFactory({
        persistenceHelper,
        projectName: customProjectName,
        contextType: 'my-custom-features',
        contextName: 'feature-1',
        content: 'custom feature content'
      });

      expect(featuresContext).toBeInstanceOf(TemplatedDocumentCollection);
    });
  });
});