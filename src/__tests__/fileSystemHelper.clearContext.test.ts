import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';

// Override the mocked fs for this test since we need real filesystem operations
jest.unmock('fs');

describe('FileSystemHelper.clearContext', () => {
  let tempDir: string;
  let fileSystemHelper: FileSystemHelper;
  let projectName: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsh-clearcontext-test-'));
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
    const result = await fileSystemHelper.clearContext(
      'nonexistent-project',
      'general'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "archiveContext: Failed to load project configuration."
    ]);
  });

  test('fails when context type is not in project configuration', async () => {
    const result = await fileSystemHelper.clearContext(
      projectName,
      'unknown-type'
    );
    
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Context type 'unknown-type' not found in project configuration"
    ]);
  });

  test('creates archive directory structure when archiving contexts', async () => {
    const contextType = 'general';
    const contextName = 'test-document';
    
    // Write a context first
    await fileSystemHelper.writeContext(projectName, contextType, contextName, 'Test content');
    
    // Clear the context
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      [contextName]
    );
    
    expect(result.success).toBe(true);
    
    // Check that archive directory was created
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const archiveStats = await fs.stat(archiveDir);
    expect(archiveStats.isDirectory()).toBe(true);
    
    // Check that a timestamped directory exists inside
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(1);
    expect(timestampedDirs[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
  });

  test('archives specific contexts and removes them from original location', async () => {
    const contextType = 'general';
    const contexts = [
      { name: 'doc-one', content: 'First document' },
      { name: 'doc-two', content: 'Second document' },
      { name: 'doc-three', content: 'Third document' }
    ];
    
    // Write multiple contexts
    for (const ctx of contexts) {
      await fileSystemHelper.writeContext(projectName, contextType, ctx.name, ctx.content);
    }
    
    // Archive specific contexts
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      ['doc-one', 'doc-three']
    );
    
    expect(result.success).toBe(true);
    
    // Check that original files are gone
    const contextDir = path.join(tempDir, 'projects', projectName, contextType);
    const remainingFiles = await fs.readdir(contextDir);
    expect(remainingFiles).toEqual(['doc-two.md']);
    
    // Check that archived files exist
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(1);
    
    const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    expect(archivedFiles.sort()).toEqual(['doc-one.md', 'doc-three.md']);
    
    // Verify archived content
    const archivedContent1 = await fs.readFile(
      path.join(archiveDir, timestampedDirs[0], 'doc-one.md'),
      'utf-8'
    );
    const archivedContent3 = await fs.readFile(
      path.join(archiveDir, timestampedDirs[0], 'doc-three.md'),
      'utf-8'
    );
    expect(archivedContent1).toBe('First document');
    expect(archivedContent3).toBe('Third document');
  });

  test('archives all contexts when no context names specified', async () => {
    const contextType = 'general';
    const contexts = [
      { name: 'alpha', content: 'Alpha content' },
      { name: 'beta', content: 'Beta content' },
      { name: 'gamma', content: 'Gamma content' }
    ];
    
    // Write multiple contexts
    for (const ctx of contexts) {
      await fileSystemHelper.writeContext(projectName, contextType, ctx.name, ctx.content);
    }
    
    // Archive all contexts (no names specified)
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType
    );
    
    expect(result.success).toBe(true);
    
    // Check that original directory is empty
    const contextDir = path.join(tempDir, 'projects', projectName, contextType);
    const remainingFiles = await fs.readdir(contextDir);
    expect(remainingFiles).toEqual([]);
    
    // Check that all files were archived
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(1);
    
    const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    expect(archivedFiles.sort()).toEqual(['alpha.md', 'beta.md', 'gamma.md']);
  });

  test('succeeds when archiving nonexistent files', async () => {
    const contextType = 'general';
    
    // Try to archive files that don't exist
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      ['nonexistent-file']
    );
    
    expect(result.success).toBe(true);
    
    // Archive directory should still be created but empty
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(1);
    
    const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    expect(archivedFiles).toEqual([]);
  });

  test('handles mixed existing and nonexistent files', async () => {
    const contextType = 'general';
    
    // Write one context
    await fileSystemHelper.writeContext(projectName, contextType, 'existing', 'Existing content');
    
    // Try to archive existing and nonexistent files
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      ['existing', 'nonexistent']
    );
    
    expect(result.success).toBe(true);
    
    // Check that existing file was archived
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    expect(archivedFiles).toEqual(['existing.md']);
    
    // Original file should be gone
    const contextDir = path.join(tempDir, 'projects', projectName, contextType);
    const remainingFiles = await fs.readdir(contextDir);
    expect(remainingFiles).toEqual([]);
  });

  describe('single-document type behavior', () => {
    beforeEach(async () => {
      // Create custom config with single-document type
      const projectPath = path.join(tempDir, 'projects', projectName);
      const configPath = path.join(projectPath, 'project-config.json');
      
      const customConfig = {
        contextTypes: [
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

    test('archives single-document regardless of context name specified', async () => {
      const contextType = 'notes';
      const content = 'Single document content';
      
      // Write content
      await fileSystemHelper.writeContext(projectName, contextType, 'any-name', content);
      
      // Archive with different context name - should still archive the single document
      const result = await fileSystemHelper.clearContext(
        projectName,
        contextType,
        ['different-name']
      );
      
      expect(result.success).toBe(true);
      
      // Check that notes.md was archived
      const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
      const timestampedDirs = await fs.readdir(archiveDir);
      const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
      expect(archivedFiles).toEqual(['notes.md']);
      
      // Verify content
      const archivedContent = await fs.readFile(
        path.join(archiveDir, timestampedDirs[0], 'notes.md'),
        'utf-8'
      );
      expect(archivedContent).toBe(content);
    });

    test('archives single-document when no context names specified', async () => {
      const contextType = 'notes';
      const content = 'Document to be archived';
      
      // Write content
      await fileSystemHelper.writeContext(projectName, contextType, 'any-name', content);
      
      // Archive without specifying context names
      const result = await fileSystemHelper.clearContext(
        projectName,
        contextType
      );
      
      expect(result.success).toBe(true);
      
      // Check that notes.md was archived
      const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
      const timestampedDirs = await fs.readdir(archiveDir);
      const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
      expect(archivedFiles).toEqual(['notes.md']);
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
          }
        ]
      };
      
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    });

    test('archives all log entries when no context names specified', async () => {
      const contextType = 'session-log';
      
      // Write multiple log entries
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'First entry');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'Second entry');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'Third entry');
      
      // Archive all log entries
      const result = await fileSystemHelper.clearContext(
        projectName,
        contextType
      );
      
      expect(result.success).toBe(true);
      
      // Check that all entries were archived
      const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
      const timestampedDirs = await fs.readdir(archiveDir);
      const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
      expect(archivedFiles).toHaveLength(3);
      
      // All archived files should be timestamped log entries
      archivedFiles.forEach(filename => {
        expect(filename).toMatch(/^session-log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
      });
      
      // Original directory should be empty
      const contextDir = path.join(tempDir, 'projects', projectName, contextType);
      const remainingFiles = await fs.readdir(contextDir);
      expect(remainingFiles).toEqual([]);
    });

    test('log types with specific context names create new timestamped archive paths', async () => {
      const contextType = 'session-log';
      
      // Write one log entry
      await fileSystemHelper.writeContext(projectName, contextType, 'session', 'Log entry');
      
      // Try to archive with specific context name - this will try to create new timestamped path
      const result = await fileSystemHelper.clearContext(
        projectName,
        contextType,
        ['session-entry']
      );
      
      // This should succeed (the clearContext method doesn't fail for missing files)
      expect(result.success).toBe(true);
      
      // The existing log file should be archived because clearContext follows the same
      // file resolution pattern as getContext, which creates new timestamped paths for log types
      const contextDir = path.join(tempDir, 'projects', projectName, contextType);
      const remainingFiles = await fs.readdir(contextDir);
      expect(remainingFiles).toHaveLength(0); // All files archived
      
      // Check that archive was created
      const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
      const timestampedDirs = await fs.readdir(archiveDir);
      expect(timestampedDirs).toHaveLength(1);
      
      const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
      expect(archivedFiles).toHaveLength(1); // The timestamped log file that was created
    });
  });

  test('creates unique archive directories for multiple clear operations', async () => {
    const contextType = 'general';
    
    // Write contexts
    await fileSystemHelper.writeContext(projectName, contextType, 'doc1', 'Content 1');
    await fileSystemHelper.writeContext(projectName, contextType, 'doc2', 'Content 2');
    
    // First clear operation
    const result1 = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      ['doc1']
    );
    expect(result1.success).toBe(true);
    
    // Wait a moment to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second clear operation
    const result2 = await fileSystemHelper.clearContext(
      projectName,
      contextType,
      ['doc2']
    );
    expect(result2.success).toBe(true);
    
    // Should have two different timestamped archive directories
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(2);
    
    // Each should contain one file
    const files1 = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    const files2 = await fs.readdir(path.join(archiveDir, timestampedDirs[1]));
    expect(files1).toHaveLength(1);
    expect(files2).toHaveLength(1);
  });

  test('handles empty context type directory', async () => {
    const contextType = 'general';
    
    // Don't write any contexts, just try to clear
    const result = await fileSystemHelper.clearContext(
      projectName,
      contextType
    );
    
    expect(result.success).toBe(true);
    
    // Archive directory should be created but empty
    const archiveDir = path.join(tempDir, 'projects', projectName, 'archive', contextType);
    const timestampedDirs = await fs.readdir(archiveDir);
    expect(timestampedDirs).toHaveLength(1);
    
    const archivedFiles = await fs.readdir(path.join(archiveDir, timestampedDirs[0]));
    expect(archivedFiles).toEqual([]);
  });
});
