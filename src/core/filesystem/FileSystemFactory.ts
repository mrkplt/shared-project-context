import { FileSystem } from './FileSystem';
import { NodeFileSystem, defaultFileSystem } from './NodeFileSystem';
import { MemoryFileSystem } from './MemoryFileSystem';

type FileSystemType = 'node' | 'memory';

/**
 * Factory for creating file system instances
 */
export class FileSystemFactory {
  /**
   * Creates a file system instance of the specified type
   * @param type Type of file system to create ('node' or 'memory')
   * @returns A new file system instance
   */
  static create(type: FileSystemType = 'node'): FileSystem {
    switch (type) {
      case 'memory':
        return new MemoryFileSystem();
      case 'node':
      default:
        return new NodeFileSystem();
    }
  }

  /**
   * Gets the default file system instance (Node.js implementation)
   */
  static get default(): FileSystem {
    return defaultFileSystem;
  }
}

/**
 * Default file system instance (Node.js implementation)
 */
export const fileSystem = FileSystemFactory.default;
