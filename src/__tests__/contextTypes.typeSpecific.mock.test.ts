import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { MockPersistenceHelper } from './mocks/MockPersistenceHelper.js';

describe('Context Type Specific Behaviors (mocked)', () => {
  let mockPersistenceHelper: MockPersistenceHelper;
  let projectName: string;

  beforeEach(() => {
    mockPersistenceHelper = new MockPersistenceHelper();
    projectName = 'test-project';
  });

  afterEach(() => {
    mockPersistenceHelper.reset();
  });

  describe('Single Document Types', () => {
    test('single document ignores contextName for storage key', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-single-document',
        contextName: 'ignored-name',
        content: 'test content'
      });

      await context.update();
      
      // Single document should store under context type name, not provided contextName
      expect(mockPersistenceHelper.hasContext(projectName, 'templated-single-document', 'templated-single-document')).toBe(true);
      expect(mockPersistenceHelper.hasContext(projectName, 'templated-single-document', 'ignored-name')).toBe(false);
    });

    test('multiple updates to single document replace content', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        contextName: 'first-name',
        content: 'first content'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
        contextName: 'different-name',
        content: 'second content'
      });

      await context1.update();
      await context2.update();
      
      // Should only have one entry with latest content
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, 'freeform-single-document', 'freeform-single-document');
      expect(storedContent).toEqual(['second content']);
    });

    test('templated single document performs reset before update', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-single-document',
        content: 'initial content'
      });

      // First update
      await context.update();
      
      // Verify content exists
      let readResult = await context.read();
      expect(readResult.content).toBe('initial content');
      
      // Second update should reset first (this is the unique behavior)
      const secondContext = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-single-document',
        content: 'replacement content'
      });
      
      await secondContext.update();
      
      // Content should be completely replaced
      readResult = await secondContext.read();
      expect(readResult.content).toBe('replacement content');
      
      // Should only have one entry
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, 'templated-single-document', 'templated-single-document');
      expect(storedContent).toEqual(['replacement content']);
    });
  });

  describe('Document Collection Types', () => {
    test('collection types create separate entries for each contextName', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'doc1',
        content: 'content for doc1'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'doc2',
        content: 'content for doc2'
      });

      await context1.update();
      await context2.update();
      
      // Verify separate storage
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-document-collection', 'doc1')).toBe(true);
      expect(mockPersistenceHelper.hasContext(projectName, 'freeform-document-collection', 'doc2')).toBe(true);
      
      // Verify correct content
      const content1 = mockPersistenceHelper.getStoredContent(projectName, 'freeform-document-collection', 'doc1');
      const content2 = mockPersistenceHelper.getStoredContent(projectName, 'freeform-document-collection', 'doc2');
      
      expect(content1).toEqual(['content for doc1']);
      expect(content2).toEqual(['content for doc2']);
    });

    test('collection types require contextName for all operations', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-document-collection',
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
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'feature1',
        content: 'original feature1 content'
      });

      // Create second document
      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'feature2',
        content: 'feature2 content'
      });

      await context1.update();
      await context2.update();
      
      // Update first document
      const context1Updated = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'feature1',
        content: 'updated feature1 content'
      });

      await context1Updated.update();
      
      // Verify feature1 was updated but feature2 unchanged
      const feature1Content = mockPersistenceHelper.getStoredContent(projectName, 'freeform-document-collection', 'feature1');
      const feature2Content = mockPersistenceHelper.getStoredContent(projectName, 'freeform-document-collection', 'feature2');
      
      expect(feature1Content).toEqual(['updated feature1 content']);
      expect(feature2Content).toEqual(['feature2 content']);
    });
  });

  describe('Log Types', () => {
    test('log types accumulate content entries', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'first log entry'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'second log entry'
      });

      await context1.update();
      await context2.update();
      
      // Log types should accumulate content
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, 'freeform-log', 'freeform-log');
      expect(storedContent).toEqual(['first log entry', 'second log entry']);
    });

    test('log types read combined content with separators', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'first entry'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-log',
        content: 'second entry'
      });

      await context1.update();
      await context2.update();
      
      // Read operation should return combined content
      const readResult = await context1.read();
      expect(readResult.success).toBe(true);
      expect(readResult.content).toContain('first entry');
      expect(readResult.content).toContain('second entry');
      expect(readResult.content).toContain('---'); // Separator
    });

    test('log types ignore contextName for storage key', async () => {
      const context = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-log',
        contextName: 'ignored-context-name',
        content: 'log entry content'
      });

      await context.update();
      
      // Log should store under context type name, not provided contextName
      expect(mockPersistenceHelper.hasContext(projectName, 'templated-log', 'templated-log')).toBe(true);
      expect(mockPersistenceHelper.hasContext(projectName, 'templated-log', 'ignored-context-name')).toBe(false);
    });

    test('log types do not reset before update (append behavior)', async () => {
      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'persistent entry'
      });

      await context1.update();

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-log',
        content: 'additional entry'
      });

      await context2.update();
      
      // Both entries should persist in storage
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, 'freeform-log', 'freeform-log');
      expect(storedContent).toEqual(['persistent entry', 'additional entry']);
      
      // Reading should show both entries
      const readResult = await context1.read();
      expect(readResult.content).toContain('persistent entry');
      expect(readResult.content).toContain('additional entry');
    });
  });

  describe('Template Validation Differences', () => {
    test('templated types have validation enabled', async () => {
      const templatedContext = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-single-document',
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
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-single-document',
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
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'templated-document-collection',
        contextName: 'test-doc',
        content: ''
      });

      const validationResult = await templatedContext.validate();
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.validationErrors).toBeDefined();
      expect(validationResult.validationErrors![0].message).toMatch(/cannot be empty/);
      expect(validationResult.correctionGuidance).toBeDefined();
    });

    test('freeform types accept empty content for validation', async () => {
      const freeformContext = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName,
        contextType: 'freeform-document-collection',
        contextName: 'test-doc',
        content: ''
      });

      const validationResult = await freeformContext.validate();
      
      expect(validationResult.isValid).toBe(true);
    });
  });

  describe('Mock Behavior Validation', () => {
    test('mock correctly implements persistence interface for context types', async () => {
      // Test that the mock properly supports all context type operations
      const testTypes = [
        { type: 'freeform-single-document', contextName: undefined },
        { type: 'freeform-document-collection', contextName: 'test-doc' },
        { type: 'freeform-log', contextName: undefined }
      ];

      for (const testType of testTypes) {
        const context = await contextTypeFactory({
          persistenceHelper: mockPersistenceHelper,
          projectName,
          contextType: testType.type,
          contextName: testType.contextName,
          content: `Test content for ${testType.type}`
        });

        // Test full lifecycle
        const updateResult = await context.update();
        expect(updateResult.success).toBe(true);

        const readResult = await context.read();
        expect(readResult.success).toBe(true);
        expect(readResult.content).toContain(`Test content for ${testType.type}`);

        const resetResult = await context.reset();
        expect(resetResult.success).toBe(true);

        // Verify reset worked
        const postResetRead = await context.read();
        if (postResetRead.success) {
          expect(postResetRead.content).toBe('');
        }
      }
    });

    test('mock maintains separate project contexts', async () => {
      // Create contexts in different projects
      const project1 = 'project-1';
      const project2 = 'project-2';
      
      // Initialize projects
      await mockPersistenceHelper.initProject(project1);
      await mockPersistenceHelper.initProject(project2);

      const context1 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: project1,
        contextType: 'general',
        contextName: 'doc1',
        content: 'content for project 1'
      });

      const context2 = await contextTypeFactory({
        persistenceHelper: mockPersistenceHelper,
        projectName: project2,
        contextType: 'general',
        contextName: 'doc1',
        content: 'content for project 2'
      });

      await context1.update();
      await context2.update();

      // Verify separate storage
      expect(mockPersistenceHelper.hasContext(project1, 'general', 'doc1')).toBe(true);
      expect(mockPersistenceHelper.hasContext(project2, 'general', 'doc1')).toBe(true);

      const content1 = mockPersistenceHelper.getStoredContent(project1, 'general', 'doc1');
      const content2 = mockPersistenceHelper.getStoredContent(project2, 'general', 'doc1');

      expect(content1).toEqual(['content for project 1']);
      expect(content2).toEqual(['content for project 2']);
    });
  });
});