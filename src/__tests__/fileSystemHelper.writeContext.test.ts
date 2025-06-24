import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.writeContext', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-writecontext-test-'));
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
    const result = await fileSystemHelper.writeContext(
      'nonexistent-project', 
      'general', 
      'test-context', 
      'test content'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Project 'nonexistent-project' does not exist. Create it first using create_project."
    ]);
  });

  test('fails when context type is not in project configuration', async () => {
    const result = await fileSystemHelper.writeContext(
      projectName, 
      'unknown-type', 
      'test-context', 
      'test content'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Context type 'unknown-type' not found in project configuration"
    ]);
  });

  test('writes freeform-document-collection context successfully', async () => {
    const contextType = 'general';
    const contextName = 'my-document';
    const content = 'This is test content for the document.';
    
    const result = await fileSystemHelper.writeContext(
      projectName, 
      contextType, 
      contextName, 
      content
    );
    
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    
    // Verify file was created with correct content
    const expectedPath = path.join(tempDir, 'projects', projectName, contextType, `${contextName}.md`);
    const writtenContent = await fs.readFile(expectedPath, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('creates context type directory if it does not exist', async () => {
    const contextType = 'general';
    const contextName = 'directory-test';
    const content = 'Testing directory creation.';
    
    // Verify directory doesn't exist initially
    const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
    await expect(fs.access(contextTypeDir)).rejects.toThrow();
    
    const result = await fileSystemHelper.writeContext(
      projectName, 
      contextType, 
      contextName, 
      content
    );
    
    expect(result.success).toBe(true);
    
    // Verify directory was created
    const stats = await fs.stat(contextTypeDir);
    expect(stats.isDirectory()).toBe(true);
    
    // Verify file was written
    const expectedPath = path.join(contextTypeDir, `${contextName}.md`);
    const writtenContent = await fs.readFile(expectedPath, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('overwrites existing context file', async () => {
    const contextType = 'general';
    const contextName = 'overwrite-test';
    const originalContent = 'Original content';
    const newContent = 'Updated content';
    
    // Write initial content
    const firstResult = await fileSystemHelper.writeContext(
      projectName, 
      contextType, 
      contextName, 
      originalContent
    );
    expect(firstResult.success).toBe(true);
    
    // Overwrite with new content
    const secondResult = await fileSystemHelper.writeContext(
      projectName, 
      contextType, 
      contextName, 
      newContent
    );
    expect(secondResult.success).toBe(true);
    
    // Verify content was updated
    const expectedPath = path.join(tempDir, 'projects', projectName, contextType, `${contextName}.md`);
    const finalContent = await fs.readFile(expectedPath, 'utf-8');
    expect(finalContent).toBe(newContent);
  });

  describe('log type behavior', () => {
    beforeEach(async () => {
      // Create custom config with log types
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
          {
            name: 'freeform-log',
            baseType: 'freeform-log',
            description: 'Freeform log entries',
            validation: false
          },
          {
            name: 'templated-log',
            baseType: 'templated-log',
            description: 'Templated log entries',
            validation: true,
            template: 'session_summary'
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    });

    test('generates timestamped filename for freeform-log', async () => {
      const contextType = 'freeform-log';
      const contextName = 'session';
      const content = 'Log entry content';
      
      const result = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        contextName, 
        content
      );
      
      expect(result.success).toBe(true);
      
      // Verify timestamped file was created
      const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
      const files = await fs.readdir(contextTypeDir);
      
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^freeform-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      
      // Verify content
      const filePath = path.join(contextTypeDir, files[0]);
      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('generates timestamped filename for templated-log', async () => {
      const contextType = 'templated-log';
      const contextName = 'development';
      const content = '# Development Session\n\nSession notes here.';
      
      const result = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        contextName, 
        content
      );
      
      expect(result.success).toBe(true);
      
      // Verify timestamped file was created
      const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
      const files = await fs.readdir(contextTypeDir);
      
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^templated-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      
      // Verify content
      const filePath = path.join(contextTypeDir, files[0]);
      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('multiple log writes create separate timestamped files', async () => {
      const contextType = 'freeform-log';
      const contextName = 'activity';
      
      // Write first entry
      const firstResult = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        contextName, 
        'First entry'
      );
      expect(firstResult.success).toBe(true);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Write second entry
      const secondResult = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        contextName, 
        'Second entry'
      );
      expect(secondResult.success).toBe(true);
      
      // Verify two separate files were created
      const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
      const files = await fs.readdir(contextTypeDir);
      
      expect(files).toHaveLength(2);
      files.forEach(file => {
        expect(file).toMatch(/^freeform-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      });
      
      // Verify different contents
      const contents = await Promise.all(
        files.map(async file => {
          const filePath = path.join(contextTypeDir, file);
          return await fs.readFile(filePath, 'utf-8');
        })
      );
      
      expect(contents.sort()).toEqual(['First entry', 'Second entry']);
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
            name: 'mental-model',
            baseType: 'templated-single-document',
            description: 'Technical architecture understanding',
            validation: true,
            template: 'mental_model'
          },
          {
            name: 'notes',
            baseType: 'freeform-single-document',
            description: 'General notes',
            validation: false
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    });

    test('uses context type name as filename for single-document types', async () => {
      const contextType = 'mental-model';
      const contextName = 'anything'; // Should be ignored for single-document
      const content = '# Mental Model\n\nArchitecture details here.';
      
      const result = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        contextName, 
        content
      );
      
      expect(result.success).toBe(true);
      
      // Verify file uses context type name, not provided context name
      const expectedPath = path.join(tempDir, 'projects', projectName, contextType, `${contextType}.md`);
      const writtenContent = await fs.readFile(expectedPath, 'utf-8');
      expect(writtenContent).toBe(content);
      
      // Verify no file with the provided context name exists
      const wrongPath = path.join(tempDir, 'projects', projectName, contextType, `${contextName}.md`);
      await expect(fs.access(wrongPath)).rejects.toThrow();
    });

    test('overwrites single-document file on subsequent writes', async () => {
      const contextType = 'notes';
      const originalContent = 'Original notes';
      const updatedContent = 'Updated notes';
      
      // First write
      const firstResult = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        'first-name', 
        originalContent
      );
      expect(firstResult.success).toBe(true);
      
      // Second write with different context name (should overwrite same file)
      const secondResult = await fileSystemHelper.writeContext(
        projectName, 
        contextType, 
        'second-name', 
        updatedContent
      );
      expect(secondResult.success).toBe(true);
      
      // Verify only one file exists with updated content
      const contextTypeDir = path.join(tempDir, 'projects', projectName, contextType);
      const files = await fs.readdir(contextTypeDir);
      
      expect(files).toEqual([`${contextType}.md`]);
      
      const filePath = path.join(contextTypeDir, files[0]);
      const finalContent = await fs.readFile(filePath, 'utf-8');
      expect(finalContent).toBe(updatedContent);
    });
  });

  test('handles empty content', async () => {
    const result = await fileSystemHelper.writeContext(
      projectName, 
      'general', 
      'empty-test', 
      ''
    );
    
    expect(result.success).toBe(true);
    
    // Verify empty file was created
    const expectedPath = path.join(tempDir, 'projects', projectName, 'general', 'empty-test.md');
    const content = await fs.readFile(expectedPath, 'utf-8');
    expect(content).toBe('');
  });

  test('handles special characters in context name', async () => {
    const contextName = 'test-context_with.special@chars';
    const content = 'Content with special context name';
    
    const result = await fileSystemHelper.writeContext(
      projectName, 
      'general', 
      contextName, 
      content
    );
    
    expect(result.success).toBe(true);
    
    // Verify file was created (filesystem should handle special chars)
    const expectedPath = path.join(tempDir, 'projects', projectName, 'general', `${contextName}.md`);
    const writtenContent = await fs.readFile(expectedPath, 'utf-8');
    expect(writtenContent).toBe(content);
  });
});
