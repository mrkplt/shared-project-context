import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.getTemplate', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-gettemplate-test-'));
    fileSystemHelper = new FileSystemHelper(tempDir);
    projectName = 'test-project';
    
    // Create project first
    await fileSystemHelper.initProject(projectName);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  });

  test('fails when project does not exist', async () => {
    const result = await fileSystemHelper.getTemplate(
      'nonexistent-project',
      'general'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "getTemplate: Failed to load project configuration."
    ]);
  });

  test('fails when context type is not in project configuration', async () => {
    const result = await fileSystemHelper.getTemplate(
      projectName,
      'unknown-type'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Context type 'unknown-type' not found in project configuration"
    ]);
  });

  test('returns project-specific template when it exists', async () => {
    const contextType = 'general';
    const templateContent = '# Project Template\\n\\nThis is a custom project template.';
    
    // Create project templates directory and template file
    const projectPath = path.join(tempDir, 'projects', projectName);
    const templatesDir = path.join(projectPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(path.join(templatesDir, 'general.md'), templateContent);
    
    const result = await fileSystemHelper.getTemplate(projectName, contextType);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([templateContent]);
  });

  test('uses custom template name from configuration', async () => {
    // Create custom config with custom template name
    const projectPath = path.join(tempDir, 'projects', projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    
    const customConfig = {
      contextTypes: [
        {
          name: 'architecture',
          baseType: 'templated-single-document',
          description: 'Architecture documentation',
          validation: true,
          template: 'custom_architecture'
        }
      ]
    };
    
    await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    
    const templateContent = '# Custom Architecture Template\\n\\nCustom template content.';
    
    // Create template with custom name
    const templatesDir = path.join(projectPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(path.join(templatesDir, 'custom_architecture.md'), templateContent);
    
    const result = await fileSystemHelper.getTemplate(projectName, 'architecture');
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([templateContent]);
  });

  test('fails when both project and repository templates are missing', async () => {
    const contextType = 'general';
    
    // Don't create any templates
    const result = await fileSystemHelper.getTemplate(projectName, contextType);
    
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to load or initialize template for general');
  });

  test('handles template with special characters and formatting', async () => {
    const contextType = 'general';
    const templateContent = `# Template with Special Characters

This template contains:
- Unicode: émojis 🚀, accents ñoño
- Symbols: @#$%^&*()
- Markdown formatting: **bold**, *italic*
- Code blocks:

\`\`\`javascript
const example = 'code';
\`\`\`

And more content...`;
    
    // Create project template
    const projectPath = path.join(tempDir, 'projects', projectName);
    const templatesDir = path.join(projectPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(path.join(templatesDir, 'general.md'), templateContent);
    
    const result = await fileSystemHelper.getTemplate(projectName, contextType);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual([templateContent]);
  });

  test('handles empty template files', async () => {
    const contextType = 'general';
    const templateContent = '';
    
    // Create empty project template
    const projectPath = path.join(tempDir, 'projects', projectName);
    const templatesDir = path.join(projectPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(path.join(templatesDir, 'general.md'), templateContent);
    
    const result = await fileSystemHelper.getTemplate(projectName, contextType);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(['']);
  });

  describe('template name resolution', () => {
    test('uses context type name when no template specified in config', async () => {
      // Default config uses context type name as template name
      const contextType = 'general';
      
      // Create template with context type name
      const projectPath = path.join(tempDir, 'projects', projectName);
      const templatesDir = path.join(projectPath, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      await fs.writeFile(path.join(templatesDir, 'general.md'), 'Default naming template');
      
      const result = await fileSystemHelper.getTemplate(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Default naming template']);
    });

    test('uses template property from config when specified', async () => {
      // Create custom config with explicit template name
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'mental-model',
            baseType: 'templated-single-document',
            description: 'Technical architecture understanding',
            validation: true,
            template: 'mental_model_template'
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
      
      // Create template with custom name
      const templatesDir = path.join(projectPath, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      await fs.writeFile(path.join(templatesDir, 'mental_model_template.md'), 'Custom template name');
      
      const result = await fileSystemHelper.getTemplate(projectName, 'mental-model');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Custom template name']);
    });
  });
});
