import { FileSystem, FileSystemError, FileSystemErrorCode } from './FileSystem';

type FileEntry = {
  content: string;
  isDirectory: boolean;
  children: Map<string, FileEntry>;
};

/**
 * In-memory implementation of the FileSystem interface for testing
 */
export class MemoryFileSystem implements FileSystem {
  private root: FileEntry = {
    content: '',
    isDirectory: true,
    children: new Map(),
  };

  async readFile(filePath: string): Promise<string> {
    const entry = await this.getEntry(filePath, false);
    if (entry.isDirectory) {
      throw new FileSystemError(
        'EISDIR: illegal operation on a directory',
        FileSystemErrorCode.IS_DIRECTORY,
        filePath
      );
    }
    return entry.content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const { dir, base } = this.parsePath(filePath);
    const parent = await this.ensureDirectory(dir);
    
    if (parent.children.has(base) && parent.children.get(base)!.isDirectory) {
      throw new FileSystemError(
        'EISDIR: illegal operation on a directory',
        FileSystemErrorCode.IS_DIRECTORY,
        filePath
      );
    }

    parent.children.set(base, {
      content,
      isDirectory: false,
      children: new Map(),
    });
  }

  async mkdir(dirPath: string, { recursive }: { recursive: boolean }): Promise<void> {
    if (await this.exists(dirPath)) {
      throw new FileSystemError(
        'EEXIST: file already exists',
        FileSystemErrorCode.ALREADY_EXISTS,
        dirPath
      );
    }

    const parts = this.normalizePath(dirPath).split('/').filter(Boolean);
    let current = this.root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        if (!recursive && !isLast) {
          throw new FileSystemError(
            'ENOENT: no such file or directory',
            FileSystemErrorCode.NOT_FOUND,
            parts.slice(0, i + 1).join('/')
          );
        }
        current.children.set(part, {
          content: '',
          isDirectory: true,
          children: new Map(),
        });
      } else if (!current.children.get(part)!.isDirectory) {
        throw new FileSystemError(
          'ENOTDIR: not a directory',
          FileSystemErrorCode.NOT_A_DIRECTORY,
          parts.slice(0, i + 1).join('/')
        );
      }
      current = current.children.get(part)!;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getEntry(path);
      return true;
    } catch (error) {
      if (error instanceof FileSystemError && error.code === FileSystemErrorCode.NOT_FOUND) {
        return false;
      }
      throw error;
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    const entry = await this.getEntry(dirPath, true);
    if (!entry.isDirectory) {
      throw new FileSystemError(
        'ENOTDIR: not a directory',
        FileSystemErrorCode.NOT_A_DIRECTORY,
        dirPath
      );
    }
    return Array.from(entry.children.keys());
  }

  /**
   * Get a file system entry
   * @param path Path to the entry
   * @param allowDirectory Whether to allow directories
   * @private
   */
  private async getEntry(path: string, allowDirectory = true): Promise<FileEntry> {
    const parts = this.normalizePath(path).split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.children.has(part)) {
        throw new FileSystemError(
          'ENOENT: no such file or directory',
          FileSystemErrorCode.NOT_FOUND,
          path
        );
      }
      current = current.children.get(part)!;
    }

    if (!allowDirectory && current.isDirectory) {
      throw new FileSystemError(
        'EISDIR: illegal operation on a directory',
        FileSystemErrorCode.IS_DIRECTORY,
        path
      );
    }

    return current;
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath Path to the directory
   * @private
   */
  private async ensureDirectory(dirPath: string): Promise<FileEntry> {
    try {
      return await this.getEntry(dirPath, true);
    } catch (error) {
      if (error instanceof FileSystemError && error.code === FileSystemErrorCode.NOT_FOUND) {
        await this.mkdir(dirPath, { recursive: true });
        return this.getEntry(dirPath, true);
      }
      throw error;
    }
  }

  /**
   * Normalize a path
   * @param path Path to normalize
   * @private
   */
  private normalizePath(path: string): string {
    // Remove leading/trailing slashes and normalize separators
    return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  /**
   * Parse a path into directory and base components
   * @param filePath Path to parse
   * @private
   */
  private parsePath(filePath: string): { dir: string; base: string } {
    const normalized = this.normalizePath(filePath);
    const lastSlash = normalized.lastIndexOf('/');
    
    if (lastSlash === -1) {
      return { dir: '', base: normalized };
    }
    
    return {
      dir: normalized.substring(0, lastSlash),
      base: normalized.substring(lastSlash + 1),
    };
  }
}
