/**
 * Core file system abstraction layer
 * Provides a consistent interface for file system operations
 */
export interface FileSystem {
  /**
   * Reads the entire contents of a file
   * @param path Path to the file
   * @returns Promise resolving to the file contents as a string
   * @throws {Error} If the file doesn't exist or cannot be read
   */
  readFile(path: string): Promise<string>;

  /**
   * Writes data to a file
   * @param path Path to the file
   * @param content Content to write
   * @returns Promise that resolves when the file is written
   * @throws {Error} If the file cannot be written
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Creates a directory
   * @param path Path to the directory
   * @param options Options for directory creation
   * @returns Promise that resolves when the directory is created
   * @throws {Error} If the directory cannot be created
   */
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;

  /**
   * Checks if a path exists
   * @param path Path to check
   * @returns Promise resolving to true if the path exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Reads the contents of a directory
   * @param path Path to the directory
   * @returns Promise resolving to an array of filenames
   * @throws {Error} If the directory cannot be read
   */
  readdir(path: string): Promise<string[]>;
}

/**
 * Standard error class for file system operations
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'FileSystemError';
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileSystemError);
    }
  }
}

/**
 * File system error codes
 */
export enum FileSystemErrorCode {
  NOT_FOUND = 'ENOENT',
  ALREADY_EXISTS = 'EEXIST',
  NOT_A_DIRECTORY = 'ENOTDIR',
  IS_DIRECTORY = 'EISDIR',
  PERMISSION_DENIED = 'EACCES',
  DIRECTORY_NOT_EMPTY = 'ENOTEMPTY'
}
