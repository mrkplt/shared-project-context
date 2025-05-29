import { NodeFileSystem } from '../../../core/filesystem/NodeFileSystem';
import { FileSystemError, FileSystemErrorCode } from '../../../core/filesystem/FileSystem';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('NodeFileSystem', () => {
  let fs: NodeFileSystem;
  let testDir: string;

  beforeEach(async () => {
    fs = new NodeFileSystem();
    // Create a unique test directory for each test
    testDir = path.join(os.tmpdir(), `cxms-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Simple cleanup - just try to remove the test directory
    // In a real test environment, you might want to use a proper temp directory cleanup
    try {
      // This is a simplified cleanup that will work for our test cases
      // In a real app, you'd want to use a proper temp directory that gets cleaned up automatically
      const nativeFs = require('fs/promises');
      await nativeFs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('writeFile and readFile', () => {
    it('should write and read a file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, world!';
      
      await fs.writeFile(filePath, content);
      const result = await fs.readFile(filePath);
      
      expect(result).toBe(content);
    });

    it('should throw when reading non-existent file', async () => {
      await expect(fs.readFile(path.join(testDir, 'nonexistent.txt')))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('mkdir', () => {
    it('should create a directory', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      
      await fs.mkdir(dirPath, { recursive: true });
      const exists = await fs.exists(dirPath);
      
      expect(exists).toBe(true);
    });

    it('should throw when creating existing directory with recursive: false', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });
      
      await expect(fs.mkdir(dirPath, { recursive: false }))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('readdir', () => {
    it('should list directory contents', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      const file1 = path.join(dirPath, 'file1.txt');
      const file2 = path.join(dirPath, 'file2.txt');
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(file1, 'File 1');
      await fs.writeFile(file2, 'File 2');
      
      const files = await fs.readdir(dirPath);
      
      expect(files).toHaveLength(2);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });

    it('should throw when reading non-directory', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test');
      
      await expect(fs.readdir(filePath))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test');
      
      const exists = await fs.exists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await fs.exists(path.join(testDir, 'nonexistent.txt'));
      expect(exists).toBe(false);
    });
  });
});
