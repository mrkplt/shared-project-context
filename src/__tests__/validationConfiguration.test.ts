/**
 * Tests for validation configuration behavior
 * Specifically tests the fix for the issue where validation=true but template=undefined
 * silently returned success instead of throwing an error
 */

import { BaseContextType } from '../models/context_types/baseContextType.js';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import { TypeConfig, ContexTypeResponse } from '../types.js';

// Create a concrete implementation of BaseContextType for testing
class TestContextType extends BaseContextType {
  async update(): Promise<ContexTypeResponse> {
    return { success: true };
  }

  async read(): Promise<ContexTypeResponse> {
    return { success: true, content: 'test content' };
  }

  async reset(): Promise<ContexTypeResponse> {
    return { success: true };
  }
}

describe('Validation Configuration Tests', () => {
  // Minimal mock - only mock what's absolutely necessary
  let mockPersistenceHelper: Partial<FileSystemHelper>;

  beforeEach(() => {
    // Only mock the methods that would be called in our test scenarios
    mockPersistenceHelper = {
      getTemplate: jest.fn(),
    } as any;
  });

  describe('validation: false scenarios', () => {
    test('should return isValid: true when validation is disabled', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: false,
        template: 'some-template'
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toBeUndefined();
      expect(mockPersistenceHelper.getTemplate).not.toHaveBeenCalled();
    });

    test('should return isValid: true when validation is undefined', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        // validation is undefined
        template: 'some-template'
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toBeUndefined();
      expect(mockPersistenceHelper.getTemplate).not.toHaveBeenCalled();
    });
  });

  describe('validation: true, template: undefined scenarios (the bug fix)', () => {
    test('should return validation error when validation is enabled but template is undefined', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        // template is undefined
      };

      const contextType = new TestContextType(
      {
      persistenceHelper: mockPersistenceHelper as FileSystemHelper,
      projectName: 'test-project',
      content: 'some content'
      },
      config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors![0].type).toBe('content_error');
      expect(result.validationErrors![0].message).toBe('Validation enabled but no template specified in configuration');
      expect(result.correctionGuidance).toContain('Set validation: false to disable validation');
      expect(result.correctionGuidance).toContain('Or specify template: "template-name" to enable validation');
      expect(mockPersistenceHelper.getTemplate).not.toHaveBeenCalled();
    });

    test('should return validation error when validation is enabled but template is empty string', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        template: '' // empty string should also trigger the error
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors![0].message).toBe('Validation enabled but no template specified in configuration');
    });
  });

  describe('validation: true, template: defined scenarios', () => {
    test('should call validator when both validation and template are defined', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        template: 'valid-template'
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        config
      );

      // This test verifies the validator is properly initialized
      // The actual validation logic is tested elsewhere
      expect((contextType as any).validator).toBeDefined();
      expect((contextType as any).config.validation).toBe(true);
      expect((contextType as any).config.template).toBe('valid-template');
    });

    test('should handle empty content appropriately', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        template: 'valid-template'
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: '   ' // whitespace-only content
        },
        config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors![0].message).toBe('test-context cannot be empty');
      expect(result.correctionGuidance).toContain('1. Add content for test-context');
      expect(result.correctionGuidance).toContain('2. Ensure content is not just whitespace');
    });

    test('should handle validator initialization failure gracefully', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        template: 'valid-template'
      };

      // Create a context type but manually clear the validator to simulate initialization failure
      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        config
      );

      // Manually clear the validator to simulate the case where validator isn't properly initialized
      (contextType as any).validator = undefined;

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors![0].message).toBe('Validation system not properly initialized');
      expect(result.correctionGuidance).toContain('Check that both validation and template are properly configured');
    });
  });

  describe('edge cases and boundary conditions', () => {
    test('should handle null content', async () => {
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        template: 'valid-template'
      };

      const contextType = new TestContextType(
      {
      persistenceHelper: mockPersistenceHelper as FileSystemHelper,
      projectName: 'test-project',
      content: undefined // undefined content
      },
      config
      );

      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors![0].message).toBe('test-context cannot be empty');
    });

    test('should handle various falsy template values', async () => {
      const falsyValues = [null, undefined, '', false, 0];
      
      for (const falsyValue of falsyValues) {
        const config: TypeConfig = {
          baseType: 'templated-single-document',
          name: 'test-context',
          description: 'Test context',
          validation: true,
          template: falsyValue as any
        };

        const contextType = new TestContextType(
          {
            persistenceHelper: mockPersistenceHelper as FileSystemHelper,
            projectName: 'test-project',
            content: 'some content'
          },
          config
        );

        const result = await contextType.validate();
        
        expect(result.isValid).toBe(false);
        expect(result.validationErrors![0].message).toBe('Validation enabled but no template specified in configuration');
      }
    });
  });

  describe('regression test: validates the actual bug fix', () => {
    test('CRITICAL: this test must fail if the bug fix is reverted', async () => {
      // This test is specifically designed to fail if someone reverts the fix
      // If you see this test failing, check the BaseContextType.validate() method
      
      const problematicConfig: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'test-context',
        description: 'Test context',
        validation: true,
        // template: undefined - this is the bug scenario
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: mockPersistenceHelper as FileSystemHelper,
          projectName: 'test-project',
          content: 'some content'
        },
        problematicConfig
      );

      const result = await contextType.validate();
      
      // These assertions MUST fail with the old buggy code:
      // OLD CODE: if (!this.config.validation || !this.validator || !this.config.template) return { isValid: true }
      // Would return: { isValid: true } (silent success - WRONG)
      // 
      // NEW CODE: Explicit checks with clear error messages
      // Returns: { isValid: false, validationErrors: [...] } (correct)
      
      expect(result.isValid).toBe(false); // OLD CODE: would be true
      expect(result.validationErrors).toBeDefined(); // OLD CODE: would be undefined
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors![0].type).toBe('content_error');
      expect(result.validationErrors![0].message).toBe('Validation enabled but no template specified in configuration');
      expect(result.correctionGuidance).toContain('Set validation: false to disable validation');
      expect(result.correctionGuidance).toContain('Or specify template: "template-name" to enable validation');
    });

    test('verifies the old behavior would have been wrong', () => {
      // This test documents what the problematic logic was
      const config = {
        validation: true,
        template: undefined
      };
      
      // Simulate the old problematic condition:
      const oldCondition = !config.validation || !true || !config.template;
      // !true || !true || !undefined
      // false || false || true = true
      
      expect(oldCondition).toBe(true); // This would have caused silent success
      
      // The old code would have returned { isValid: true } - silently ignoring the validation request
      // This was the bug: user explicitly set validation=true but got no validation
    });
  });

  describe('focused unit test: minimal dependencies', () => {
    test('validates fix works without any mocking at all', async () => {
      // This test uses no mocks to ensure we're testing real behavior
      // We can do this because the bug fix code path doesn't depend on external services
      
      const realFileSystemHelper = {} as FileSystemHelper; // Empty object, won't be called
      
      const config: TypeConfig = {
        baseType: 'templated-single-document',
        name: 'real-test',
        description: 'Real test with no mocks',
        validation: true,
        // template: undefined - the bug case
      };

      const contextType = new TestContextType(
        {
          persistenceHelper: realFileSystemHelper,
          projectName: 'test-project',
          content: 'real content'
        },
        config
      );

      // The validate method should return an error immediately without calling any external dependencies
      const result = await contextType.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors![0].message).toBe('Validation enabled but no template specified in configuration');
      // If this test passes, we know the fix works with zero mocking
    });
  });
});
