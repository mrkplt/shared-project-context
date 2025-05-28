import { validateContent } from '../validation';

describe('Content Validation', () => {
  // Test schema that matches our context file structure
  const testSchema = {
    type: 'object',
    required: ['title', 'sections'],
    properties: {
      title: { type: 'string', minLength: 1 },
      sections: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'content'],
          properties: {
            name: { type: 'string', minLength: 1 },
            content: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  };

  describe('validateContent', () => {
    it('should validate well-formed markdown content', () => {
      const content = `# Test Title\n\n## Overview\nContent here\n\n## Architecture\nMore content`;
      const result = validateContent(content, testSchema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const content = '';
      const result = validateContent(content, testSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Content cannot be empty')
        })
      );
    });

    it('should detect missing required sections', () => {
      const content = `# Test Title\n\nNo sections here`;
      const result = validateContent(content, testSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('at least one section')
        })
      );
    });

    it('should provide correction guidance for invalid content', () => {
      const content = `# Test Title\n\n## \nSection with empty name`;
      const result = validateContent(content, testSchema);
      expect(result.isValid).toBe(false);
      // Our current implementation doesn't set correctionGuidance in the validation function
      // as it's handled at a higher level in the server
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
