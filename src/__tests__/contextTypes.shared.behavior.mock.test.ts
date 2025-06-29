import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import contextTypeFactory from '../models/contexTypeFactory.js';
import { MockPersistenceHelper } from './mocks/MockPersistenceHelper.js';
import { ContextType } from '../types.js';

interface ContextTypeScenario {
  name: string;
  baseType: string;
  requiresTemplate: boolean;
  requiresContextName: boolean;
  behaviorType: 'replace' | 'collection' | 'append';
  template?: string;
}

const contextTypeScenarios: ContextTypeScenario[] = [
  {
    name: 'templated-single-document',
    baseType: 'templated-single-document',
    requiresTemplate: true,
    requiresContextName: false,
    behaviorType: 'replace',
    template: 'mental_model'
  },
  {
    name: 'freeform-single-document',
    baseType: 'freeform-single-document',
    requiresTemplate: false,
    requiresContextName: false,
    behaviorType: 'replace'
  },
  {
    name: 'templated-document-collection',
    baseType: 'templated-document-collection',
    requiresTemplate: true,
    requiresContextName: true,
    behaviorType: 'collection',
    template: 'features'
  },
  {
    name: 'freeform-document-collection',
    baseType: 'freeform-document-collection',
    requiresTemplate: false,
    requiresContextName: true,
    behaviorType: 'collection'
  },
  {
    name: 'templated-log',
    baseType: 'templated-log',
    requiresTemplate: true,
    requiresContextName: false,
    behaviorType: 'append',
    template: 'session_summary'
  },
  {
    name: 'freeform-log',
    baseType: 'freeform-log',
    requiresTemplate: false,
    requiresContextName: false,
    behaviorType: 'append'
  }
];

describe.each(contextTypeScenarios)('$name shared behavior (mocked)', (scenario) => {
  let mockPersistenceHelper: MockPersistenceHelper;
  let projectName: string;

  beforeEach(() => {
    mockPersistenceHelper = new MockPersistenceHelper();
    projectName = 'test-project';
  });

  afterEach(() => {
    mockPersistenceHelper.reset();
  });

  async function createTestContext(content: string = 'test content', contextName?: string): Promise<ContextType> {
    const factoryArgs: any = {
      persistenceHelper: mockPersistenceHelper,
      projectName,
      contextType: scenario.name,
      content
    };

    if (scenario.requiresContextName || contextName) {
      factoryArgs.contextName = contextName || 'test-context';
    }

    return await contextTypeFactory(factoryArgs);
  }

  describe('Basic Operations', () => {
    test('update stores content successfully', async () => {
      const content = `Test content for ${scenario.name}`;
      const context = await createTestContext(content);
      
      const updateResult = await context.update();
      expect(updateResult.success).toBe(true);
      expect(updateResult.errors).toBeUndefined();
      
      // Verify content was stored in mock
      const contextKey = scenario.requiresContextName ? 'test-context' : scenario.name;
      expect(mockPersistenceHelper.hasContext(projectName, scenario.name, contextKey)).toBe(true);
    });

    test('read returns empty when no content exists', async () => {
      const context = await createTestContext();
      
      const readResult = await context.read();
      // Most context types will return empty content when no files exist
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
      const contextKey = scenario.requiresContextName ? 'test-context' : scenario.name;
      expect(mockPersistenceHelper.hasContext(projectName, scenario.name, contextKey)).toBe(true);
      
      // Reset
      const resetResult = await context.reset();
      expect(resetResult.success).toBe(true);
      
      // Verify content is cleared
      expect(mockPersistenceHelper.hasContext(projectName, scenario.name, contextKey)).toBe(false);
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
        persistenceHelper: mockPersistenceHelper,
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
          persistenceHelper: mockPersistenceHelper,
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
      
      // Wait a moment for log types to ensure different timestamps
      if (scenario.behaviorType === 'append') {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Second update with different content
      if (scenario.behaviorType === 'append') {
        // For log types, create a new context to append additional content
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
            // Same context name should replace
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
      
      // Verify using mock helper that context is actually cleared
      const contextKey = scenario.requiresContextName ? 'test-context' : scenario.name;
      expect(mockPersistenceHelper.hasContext(projectName, scenario.name, contextKey)).toBe(false);
    });
  });

  describe('Mock Integration Validation', () => {
    test('mock correctly simulates context type behavior', async () => {
      // This test validates that our mock is working correctly for this context type
      const content = 'validation content';
      const context = await createTestContext(content);
      
      await context.update();
      
      // Check that the mock stored the content according to the context type's behavior
      const contextKey = scenario.requiresContextName ? 'test-context' : scenario.name;
      const storedContent = mockPersistenceHelper.getStoredContent(projectName, scenario.name, contextKey);
      
      expect(storedContent).toBeDefined();
      expect(storedContent).toContain(content);
      
      // For log types, content should accumulate
      if (scenario.behaviorType === 'append') {
        const secondContext = await createTestContext('second content');
        await secondContext.update();
        
        const updatedContent = mockPersistenceHelper.getStoredContent(projectName, scenario.name, contextKey);
        expect(updatedContent).toHaveLength(2);
        expect(updatedContent).toContain(content);
        expect(updatedContent).toContain('second content');
      }
    });

    test('mock handles context type configuration correctly', async () => {
      // Verify that the mock has the correct configuration for this context type
      const configResponse = await mockPersistenceHelper.getProjectConfig(projectName);
      expect(configResponse.success).toBe(true);
      
      const contextTypeConfig = configResponse.config!.contextTypes.find(ct => ct.name === scenario.name);
      expect(contextTypeConfig).toBeDefined();
      expect(contextTypeConfig!.baseType).toBe(scenario.baseType);
      expect(contextTypeConfig!.validation).toBe(scenario.requiresTemplate);
      
      if (scenario.template) {
        expect(contextTypeConfig!.template).toBe(scenario.template);
      }
    });
  });
});