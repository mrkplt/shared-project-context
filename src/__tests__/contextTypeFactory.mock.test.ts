import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { MockPersistenceHelper } from './mocks/MockPersistenceHelper.js';
import { TemplatedSingleDocument } from '../models/context_types/templatedSingleDocument.js';
import { FreeformSingleDocument } from '../models/context_types/freeformSingleDocument.js';
import { TemplatedDocumentCollection } from '../models/context_types/templatedDocumentCollection.js';
import { FreeformDocumentCollection } from '../models/context_types/freeformDocumentCollection.js';
import { TemplatedLog } from '../models/context_types/templatedLog.js';
import { FreeformLog } from '../models/context_types/freeformLog.js';

describe('contextTypeFactory (with mocked persistence)', () => {
  let mockPersistenceHelper: MockPersistenceHelper;
  let projectName: string;

  beforeEach(() => {
    mockPersistenceHelper = new MockPersistenceHelper();
    projectName = 'test-project';
  });

  afterEach(() => {
    mockPersistenceHelper.reset();
  });

  describe('Context Type Instantiation', () => {
    test('creates TemplatedSingleDocument instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-single-document',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedSingleDocument);
      expect(context.persistenceHelper).toBe(mockPersistenceHelper);
    });

    test('creates FreeformSingleDocument instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(FreeformSingleDocument);
    });

    test('creates TemplatedDocumentCollection instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-document-collection',
        contextName: 'test-feature',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedDocumentCollection);
    });

    test('creates FreeformDocumentCollection instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'test-doc',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(FreeformDocumentCollection);
    });

    test('creates TemplatedLog instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'test content'
      });

      expect(context).toBeInstanceOf(TemplatedLog);
    });

    test('creates FreeformLog instance', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
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
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'unknown-type',
        content: 'test content'
      })).rejects.toThrow('Unknown context type: unknown-type');
    });

    test('throws error for unknown base type', async () => {
      // Set up project with invalid base type configuration
      mockPersistenceHelper.setProjectConfig(projectName, {
        contextTypes: [
          {
            name: 'invalid-context',
            baseType: 'unknown-base-type' as any,
            description: 'Invalid context type',
            validation: false
          }
        ]
      });

      await expect(contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'invalid-context',
        content: 'test content'
      })).rejects.toThrow('Unknown base type: unknown-base-type');
    });

    test('throws error for nonexistent project', async () => {
      await expect(contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: 'nonexistent-project',
        contextType: 'templated-single-document',
        content: 'test content'
      })).rejects.toThrow(/Failed to load project configuration/);
    });

    test('throws error when project directory does not exist', async () => {
      await expect(contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: 'never-created-project',
        contextType: 'general',
        content: 'test content'
      })).rejects.toThrow(/Failed to load project configuration/);
    });
  });

  describe('Parameter Passing', () => {
    test('passes all parameters to context type constructor', async () => {
      const contextName = 'test-context';
      const content = 'test content for parameter passing';

      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName,
        content
      });

      // Verify parameters were passed correctly by testing update operation
      const updateResult = await context.update();
      expect(updateResult.success).toBe(true);

      // Verify content was stored correctly using mock helper
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, 'freeform-document-collection', contextName);
      expect(storedContent).toEqual([content]);
    });

    test('handles optional parameters correctly', async () => {
      // Test factory with minimal parameters - use default 'general' context type
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: 'default-config-project',
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
      const customConfig = {
        contextTypes: [
          {
            name: 'my-custom-notes',
            baseType: 'freeform-single-document' as const,
            description: 'Custom notes context',
            validation: false
          },
          {
            name: 'my-custom-features',
            baseType: 'templated-document-collection' as const,
            description: 'Custom features context',
            validation: true,
            template: 'features'
          }
        ]
      };
      
      mockPersistenceHelper.setProjectConfig(customProjectName, customConfig);

      // Test custom context type creation
      const notesContext = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: customProjectName,
        contextType: 'my-custom-notes',
        content: 'custom notes content'
      });

      expect(notesContext).toBeInstanceOf(FreeformSingleDocument);

      const featuresContext = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: customProjectName,
        contextType: 'my-custom-features',
        contextName: 'feature-1',
        content: 'custom feature content'
      });

      expect(featuresContext).toBeInstanceOf(TemplatedDocumentCollection);
    });

    test('validates factory configuration mapping', async () => {
      // Test that factory correctly maps each base type to the right class
      const testCases = [
        { baseType: 'templated-single-document', expectedClass: TemplatedSingleDocument },
        { baseType: 'freeform-single-document', expectedClass: FreeformSingleDocument },
        { baseType: 'templated-document-collection', expectedClass: TemplatedDocumentCollection },
        { baseType: 'freeform-document-collection', expectedClass: FreeformDocumentCollection },
        { baseType: 'templated-log', expectedClass: TemplatedLog },
        { baseType: 'freeform-log', expectedClass: FreeformLog }
      ];

      for (const testCase of testCases) {
        const customProjectName = `test-${testCase.baseType}`;
        mockPersistenceHelper.setProjectConfig(customProjectName, {
          contextTypes: [
            {
              name: 'test-context',
              baseType: testCase.baseType as any,
              description: `Test ${testCase.baseType}`,
              validation: testCase.baseType.includes('templated'),
              ...(testCase.baseType.includes('templated') && { template: 'test-template' })
            }
          ]
        });

        const context = await contextTypeFactory({
          persistenceHelper: mockPersistenceHelper,
          projectName: customProjectName,
          contextType: 'test-context',
          contextName: 'test',
          content: 'test content'
        });

        expect(context).toBeInstanceOf(testCase.expectedClass);
      }
    });
  });

  describe('Context Type Behavior Integration', () => {
    test('factory creates functional context types', async () => {
      // Test that factory-created instances actually work end-to-end
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        content: 'test content'
      });

      // Test update
      const updateResult = await context.update();
      expect(updateResult.success).toBe(true);

      // Test read
      const readResult = await context.read();
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe('test content');

      // Test reset
      const resetResult = await context.reset();
      expect(resetResult.success).toBe(true);

      // Verify context was cleared
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-single-document')).toBe(false);
    });

    test('factory respects context type-specific behaviors', async () => {
      // Test single document vs collection behavior difference
      const singleDoc = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        contextName: 'ignored-name',
        content: 'single doc content'
      });

      const collection = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'doc-name',
        content: 'collection content'
      });

      await singleDoc.update();
      await collection.update();

      // Single document should store under context type name
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-single-document', 'freeform-single-document')).toBe(true);
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-single-document', 'ignored-name')).toBe(false);

      // Collection should store under provided context name
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-document-collection', 'doc-name')).toBe(true);
    });
  });
});