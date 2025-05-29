import { MemoryFileSystem } from '../../../core/filesystem/MemoryFileSystem';
import { FileSystemError, FileSystemErrorCode } from '../../../core/filesystem/FileSystem';

describe('MemoryFileSystem', () => {
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem();
  });

  describe('writeFile and readFile', () => {
    it('should write and read a file', async () => {
      const path = '/test.txt';
      const content = 'Hello, world!';
      
      await fs.writeFile(path, content);
      const result = await fs.readFile(path);
      
      expect(result).toBe(content);
    });

    it('should throw when reading non-existent file', async () => {
      await expect(fs.readFile('/nonexistent.txt'))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('mkdir', () => {
    it('should create a directory', async () => {
      const path = '/test-dir';
      
      await fs.mkdir(path, { recursive: true });
      const exists = await fs.exists(path);
      
      expect(exists).toBe(true);
    });

    it('should throw when creating existing directory', async () => {
      const path = '/test-dir';
      await fs.mkdir(path, { recursive: true });
      
      await expect(fs.mkdir(path, { recursive: false }))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('readdir', () => {
    it('should list directory contents', async () => {
      const dirPath = '/test-dir';
      const file1 = `${dirPath}/file1.txt`;
      const file2 = `${dirPath}/file2.txt`;
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(file1, 'File 1');
      await fs.writeFile(file2, 'File 2');
      
      const files = await fs.readdir(dirPath);
      
      expect(files).toHaveLength(2);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });

    it('should throw when reading non-directory', async () => {
      const filePath = '/test.txt';
      await fs.writeFile(filePath, 'test');
      
      await expect(fs.readdir(filePath))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const path = '/test.txt';
      await fs.writeFile(path, 'test');
      
      const exists = await fs.exists(path);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await fs.exists('/nonexistent.txt');
      expect(exists).toBe(false);
    });
  });
});
