import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystem, FileSystemError, FileSystemErrorCode } from './FileSystem';

/**
 * Node.js implementation of the FileSystem interface
 * Wraps the fs/promises API with consistent error handling
 */
export class NodeFileSystem implements FileSystem {
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.handleError(error, filePath);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      return await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      this.handleError(error, filePath);
    }
  }

  async mkdir(dirPath: string, options: { recursive: boolean }): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: options.recursive });
    } catch (error) {
      this.handleError(error, dirPath);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === FileSystemErrorCode.NOT_FOUND) {
        return false;
      }
      this.handleError(error, path);
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      this.handleError(error, dirPath);
    }
  }

  private handleError(error: unknown, path: string): never {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      throw new FileSystemError(
        nodeError.message,
        nodeError.code,
        path
      );
    }
    throw new FileSystemError('Unknown filesystem error', undefined, path);
  }
}

/**
 * Default file system instance using Node.js implementation
 */
export const defaultFileSystem = new NodeFileSystem();
