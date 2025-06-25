import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.listAllContextForType', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-listcontextfortype-test-'));
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
    const result = await fileSystemHelper.listAllContextForType(
      'nonexistent-project',
      'general'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Failed to load project configuration'
    ]);
  });

  test('fails when context type is not in project configuration', async () => {
    const result = await fileSystemHelper.listAllContextForType(
      projectName,
      'unknown-type'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Context type 'unknown-type' not found in project configuration"
    ]);
  });

  describe('collection type behavior', () => {
    test('returns empty array when no contexts exist for collection type', async () => {
      const result = await fileSystemHelper.listAllContextForType(
        projectName,
        'general' // freeform-document-collection
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('returns context names for freeform-document-collection', async () => {
      const contextType = 'general';
      
      // Write multiple contexts
      await fileSystemHelper.writeContext(projectName, contextType, 'doc-alpha', 'Alpha content');
      await fileSystemHelper.writeContext(projectName, contextType, 'doc-beta', 'Beta content');
      await fileSystemHelper.writeContext(projectName, contextType, 'doc-gamma', 'Gamma content');
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.sort()).toEqual(['doc-alpha', 'doc-beta', 'doc-gamma']);
    });

    test('returns context names for templated-document-collection', async () => {
      // Create custom config with templated document collection
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'templated-docs',
            baseType: 'templated-document-collection',
            description: 'Templated document collection',
            validation: true,
            template: 'document'
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
      
      const contextType = 'templated-docs';
      
      // Write multiple contexts
      await fileSystemHelper.writeContext(projectName, contextType, 'context-one', 'Content one');
      await fileSystemHelper.writeContext(projectName, contextType, 'context-two', 'Content two');
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data.sort()).toEqual(['context-one', 'context-two']);
    });
  });

  describe('log type behavior', () => {
    beforeEach(async () => {
      // Create custom config with log type
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'session-log',
            baseType: 'freeform-log',
            description: 'Session log entries',
            validation: false
          },
          {
            name: 'templated-log',
            baseType: 'templated-log',
            description: 'Templated log entries',
            validation: true,
            template: 'log_entry'
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    });

    test('returns empty array when no log entries exist', async () => {
      const result = await fileSystemHelper.listAllContextForType(
        projectName,
        'session-log'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('returns timestamped context names for freeform-log', async () => {
      const contextType = 'session-log';
      
      // Write multiple log entries
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'First entry');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'Second entry');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'Third entry');
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      
      // All entries should follow the timestamped naming pattern
      result.data!.forEach(name => {
        expect(name).toMatch(/^session-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
      });
    });

    test('returns timestamped context names for templated-log', async () => {
      const contextType = 'templated-log';
      
      // Write multiple log entries
      await fileSystemHelper.writeContext(projectName, contextType, 'log', 'Template entry 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fileSystemHelper.writeContext(projectName, contextType, 'log', 'Template entry 2');
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      
      // All entries should follow the timestamped naming pattern
      result.data!.forEach(name => {
        expect(name).toMatch(/^templated-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
      });
    });
  });

  describe('single-document type behavior', () => {
    beforeEach(async () => {
      // Create custom config with single-document types
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'notes',
            baseType: 'freeform-single-document',
            description: 'General notes',
            validation: false
          },
          {
            name: 'architecture',
            baseType: 'templated-single-document',
            description: 'Architecture documentation',
            validation: true,
            template: 'architecture'
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    });

    test('returns context type name for freeform-single-document', async () => {
      const contextType = 'notes';
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([contextType]);
    });

    test('returns context type name for templated-single-document', async () => {
      const contextType = 'architecture';
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([contextType]);
    });

    test('returns context type name even when document exists', async () => {
      const contextType = 'notes';
      
      // Write content to the single document
      await fileSystemHelper.writeContext(projectName, contextType, 'any-name', 'Document content');
      
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([contextType]); // Still returns context type, not filename
    });

    test('returns context type name even when document does not exist', async () => {
      const contextType = 'notes';
      
      // Don't write any content
      const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([contextType]);
    });
  });

  test('handles context names with special characters', async () => {
    const contextType = 'general';
    
    // Write contexts with various naming patterns
    await fileSystemHelper.writeContext(projectName, contextType, 'context-with-dashes', 'Content 1');
    await fileSystemHelper.writeContext(projectName, contextType, 'context_with_underscores', 'Content 2');
    await fileSystemHelper.writeContext(projectName, contextType, 'context123', 'Content 3');
    await fileSystemHelper.writeContext(projectName, contextType, 'ContextCamelCase', 'Content 4');
    
    const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data.sort()).toEqual([
      'ContextCamelCase',
      'context-with-dashes',
      'context123',
      'context_with_underscores'
    ]);
  });

  test('should only return markdown files', async () => {
    const contextType = 'general';
    
    // Write valid markdown context
    await fileSystemHelper.writeContext(projectName, contextType, 'valid-context', 'Valid content');
    
    // Create non-markdown files in the context directory
    const contextDir = path.join(tempDir, 'projects', projectName, contextType);
    await fs.writeFile(path.join(contextDir, 'not-markdown.txt'), 'Text file');
    await fs.writeFile(path.join(contextDir, 'config.json'), '{}');
    
    const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
    
    expect(result.success).toBe(true);
    // THIS TEST DOCUMENTS THE EXPECTED BEHAVIOR:
    // The method SHOULD only return context names from .md files
    // When the production code is fixed, this test should pass
    expect(result.data).toEqual(['valid-context']); // Only markdown files should be included
  });

  test('handles large number of contexts', async () => {
    const contextType = 'general';
    
    // Create many contexts
    const contextNames = [];
    for (let i = 0; i < 30; i++) {
      const contextName = `context-${i.toString().padStart(3, '0')}`;
      await fileSystemHelper.writeContext(projectName, contextType, contextName, `Content ${i}`);
      contextNames.push(contextName);
    }
    
    const result = await fileSystemHelper.listAllContextForType(projectName, contextType);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(30);
    expect(result.data.sort()).toEqual(contextNames.sort());
  });
});
