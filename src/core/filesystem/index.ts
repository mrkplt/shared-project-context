// Core file system interfaces and types
export * from './FileSystem';

// Implementations
export * from './NodeFileSystem';
export * from './MemoryFileSystem';

// Factory
export * from './FileSystemFactory';

// Default export is the Node.js implementation
export { defaultFileSystem as default } from './NodeFileSystem';
