import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';
import fs from 'fs/promises';
import { PersistenceHelper, ProjectConfig, TypeConfig } from '../../../types.js';
import { PersistenceResponse } from '../../../types.js';
import { DateTime } from 'luxon';

export class FileSystemHelper implements PersistenceHelper {
  contextRoot: string;
  private configCache: Map<string, ProjectConfig> = new Map();
  
  constructor(
    contextRoot: string = path.join(os.homedir(), '.shared-project-context')
  ) {
    this.contextRoot = contextRoot;
  }

  async initProject(projectName: string): Promise<PersistenceResponse> {
    try {
      // Check if project already exists
      if (await this.projectExists(projectName)) {
        return { 
          success: false, 
          errors: [`Project '${projectName}' already exists.`] 
        };
      }
      
      // Create project directory
      await this.ensureDirectoryExists(
        await this.getProjectPath(projectName)
      );
      return {success: true};
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async listProjects(): Promise< PersistenceResponse > {
    try {
      await this.ensureDirectoryExists(path.join(this.contextRoot, 'projects'))
      const entries = await this.readDirectory( path.join(this.contextRoot, 'projects'), { withFileTypes: true }) as Dirent[];
      return { success: true, data: entries.filter(entry => entry.isDirectory()).map(entry => entry.name) };
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }
  
  async getContext(projectName: string, contextType: string, contextNames?: string[]): Promise<PersistenceResponse> {
    const response = await this.getProjectConfig(projectName);
    if (!response.success || !response.config) {
      return { success: false, errors: [`getContext: Failed to load project configuration.`] };
    }
    const config = response.config;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
    }
    
    if (!await this.projectExists(projectName)) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, contextType));
    // If the contextNames are specified, then return the specified contexts.
    // If the contextNames are not specified, then return all contexts for
    // the specified context type.

    try {

      let filePaths;
      if (contextNames) {
        const filePathPromises = contextNames.map(name => 
          this.buildContextFilePath(projectName, contextType, name)
        );
        filePaths = await Promise.all(filePathPromises);
      } else {
        filePaths = (await this.listPathsForType(projectName, contextType)).map(dirent => path.join(dirent.parentPath, dirent.name));
      }

      // Read all files concurrently
      const fileReadPromises = filePaths.map(async (filePath, index) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { content, error: null, name: filePath.split('/').pop() };
        } catch (error) {
          if (
            error instanceof Error 
            && (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            return { content: null, error: 'Context not found. Have you created it using create_context yet?', name: contextTypeConfig.name };
          }
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { content: null, error: errorMessage, name: filePaths[index].split('/').pop() };
        }
      });
      
      const results = await Promise.all(fileReadPromises);
      
      // Check if any reads failed
      const errors = results
        .filter(result => result.error !== null)
        .map(result => `${result.name}: ${result.error}`);
      
      // If any errors, return failure
      if (errors.length > 0) {
        return { success: false, errors };
      }
      
      // Sort results by name and extract content
      const sortedResults = results
        .filter(result => result.content !== null)
        .sort((a, b) => (b.name || '').localeCompare(a.name || ''))
      
      const data = sortedResults.map(result => result.content!);
      
      return { success: true, data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  async writeContext(projectName: string, contextType: string, contextName: string, content: string): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName); 
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }
    
    await this.ensureDirectoryExists(path.join(projectPath, contextType));
    
    try {
      const response = await this.getProjectConfig(projectName);
      if (!response.success || !response.config) {
        return { success: false, errors: [`WriteContext: Failed to load project configuration.`] };
      }
      const config = response.config;
      const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
      
      if (!contextTypeConfig) {
        return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
      }

      const fileName = (contextTypeConfig.baseType === 'templated-log' || contextTypeConfig.baseType === 'freeform-log')
        ? this.generateTimestampedContextName(contextName) 
        : contextName;
     
      const filePath = await this.buildContextFilePath(projectName, contextType, fileName);
      
      await fs.writeFile(filePath, content);

      return { success: true };

    } catch (error) {
      return {success: false, errors: [`Failed to write context: ${error instanceof Error ? error.message : 'Unknown error'}`]};
    }
  }

  async getTemplate(projectName: string, contextType: string): Promise<PersistenceResponse> {
    try {
      const response = await this.getProjectConfig(projectName);
      if (!response.success || !response.config) {
        return { success: false, errors: [`getTemplate: Failed to load project configuration.`] };
      }

      const config = response.config;
      const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
      
      if (!contextTypeConfig) {
        return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
      }

      const projectPath = await this.getProjectPath(projectName);
      const projectTemplatesDir = path.join(projectPath, 'templates');
      const templateName = contextTypeConfig.template || contextType;
      const projectTemplatePath = path.join(projectTemplatesDir, `${templateName}.md`);
      
      // Check if project template exists
      try {
        const projectTemplateContent = await fs.readFile(projectTemplatePath, 'utf-8');
        return {
          success: true,
          data: [projectTemplateContent]
        };
      } catch (projectError) {
        // Project template doesn't exist, initialize it from repository default
        try {
          const repositoryRoot = path.resolve(process.cwd());
          const defaultTemplatePath = path.join(repositoryRoot, 'templates', `${templateName}.md`);
          
          // Read the repository default template
          const defaultTemplateContent = await fs.readFile(defaultTemplatePath, 'utf-8');
          
          // Ensure project templates directory exists
          await this.ensureDirectoryExists(projectTemplatesDir);
          
          // Copy the default template to the project
          await fs.writeFile(projectTemplatePath, defaultTemplateContent);
          
          // Return the template content (now copied to project)
          return {
            success: true,
            data: [defaultTemplateContent]
          };
        } catch (repositoryError) {
          return {
            success: false,
            errors: [`Failed to load or initialize template for ${contextType}: ${repositoryError instanceof Error ? repositoryError.message : 'Unknown error'}`]
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to load template for ${contextType}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // This actually implements archiving though the intention from a user perspective is that
  // the context is removed. It is named clearContext to because not all persistence methods
  // implement archiving.
  async clearContext(projectName: string, contextType: string, contextNames?: string[]): Promise<PersistenceResponse> {
    const response = await this.getProjectConfig(projectName);
    if (!response.success || !response.config) {
      return { success: false, errors: [`archiveContext: Failed to load project configuration.`] };
    }
    const config = response.config;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
    }
    
    if (!await this.projectExists(projectName)) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, 'archive', contextType));

    try {
      const timestamp = this.timestamp();
      const archiveDir = path.join(projectPath, 'archive', contextType, timestamp);
      
      // Ensure the archive directory exists
      await this.ensureDirectoryExists(archiveDir);

      // Follow same pattern as getContext for finding files to archive
      let filePaths;
      if (contextNames) {
        // For log types, we need to find existing files that match the context name prefix
        // For other types, use buildContextFilePath
        if (contextTypeConfig.baseType === 'templated-log' || contextTypeConfig.baseType === 'freeform-log') {
          // Get all existing files and filter by context name prefix
          const dirEntries = await this.listPathsForType(projectName, contextType);
          filePaths = dirEntries
            .filter(dirent => {
              // Check if any of the provided context names match the file prefix
              return contextNames.some(contextName => 
                dirent.name.startsWith(`${contextName}-`)
              );
            })
            .map(dirent => path.join(dirent.parentPath, dirent.name));
        } else {
          // For non-log types, use buildContextFilePath as before
          const filePathPromises = contextNames.map(name => 
            this.buildContextFilePath(projectName, contextType, name)
          );
          filePaths = await Promise.all(filePathPromises);
        }
      } else {
        // No specific names - get all file paths directly (like getContext does)
        const dirEntries = await this.listPathsForType(projectName, contextType);
        filePaths = dirEntries.map(dirent => path.join(dirent.parentPath, dirent.name));
      }

      // Process each file path
      const movePromises = filePaths.map(async (filePath) => {
        try {
          if (!(await this.fileExists(filePath))) {
            return { success: true, name: path.basename(filePath) };
          }

          // Get the filename from the source path
          const fileName = path.basename(filePath);
          
          // Create destination path in archive directory
          const destinationPath = path.join(archiveDir, fileName);
          
          // Move the file to archive
          await fs.rename(filePath, destinationPath);
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, name: path.basename(filePath), error: errorMessage };
        }
      });
      
      const results = await Promise.all(movePromises);
      
      // Check if any moves failed
      const errors = results
        .filter(result => !result.success)
        .map(result => `${result.name}: ${result.error}`);
      
      // If any errors, return failure
      if (errors.length > 0) {
        return { success: false, errors };
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  async getProjectConfig(projectName: string): Promise<PersistenceResponse> {
    // Check cache first
    if (this.configCache.has(projectName)) {
      return { success: true, config: this.configCache.get(projectName) };
    }
  
    const projectPath = await this.getProjectPath(projectName);
    const configPath = path.join(projectPath, 'project-config.json');
    
    let config: ProjectConfig;
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        const errorMessage = `Error parsing config file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
        return { success: false, errors: [errorMessage] };
      }
    } catch (error) {
      // Only create default config if file doesn't exist
      const isNodeError = (error: any): error is NodeJS.ErrnoException => {
        return error && typeof error === 'object' && 'code' in error;
      };
      
      if (isNodeError(error) && error.code === 'ENOENT') {
        config = this.getDefaultConfig();
        try {
          await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        } catch (writeError) {
          const errorMessage = `Error creating default config: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`;
          return { success: false, errors: [errorMessage] };
        }
      } else {
        // For any other error reading the file, return the error
        const errorMessage = `Error reading config file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        return { success: false, errors: [errorMessage] };
      }
    }
    
    // Cache the configuration
    this.configCache.set(projectName, config);
    return { success: true, config: config };
}

  async listAllContextForType(projectName: string, contextType: string): Promise<PersistenceResponse> {
    // Get the config to check the base type
    const configResponse = await this.getProjectConfig(projectName);
    if (!configResponse.success || !configResponse.config) {
      return { success: false, errors: ['Failed to load project configuration'] };
    }
    
    const contextTypeConfig = configResponse.config.contextTypes.find(ct => ct.name === contextType);
    if (!contextTypeConfig) {
      return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
    }
    
   const filePaths = await this.listPathsForType(projectName, contextType);

    // For collection types, return the list of context names from the directory
    if (contextTypeConfig.baseType.endsWith('-collection')) {
      return { success: true, data: await this.onlyContextNamesFromDirectory(filePaths) };
    }
    
    // For single-document and log types, return just the context type name
    // Log types are an abstraction - we don't expose individual timestamped files
    return { success: true, data: [contextType] };
  }

  private async readDirectory(dirPath: string, options: { withFileTypes: boolean, recursive?: boolean } = { withFileTypes: true }): Promise<string[] | Dirent[]> {
    try {
      const entries = await fs.readdir(dirPath, { ...options, withFileTypes: true });
      return options.withFileTypes 
        ? entries as Dirent[] 
        : entries as unknown as string[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Directory not found');
      }
      throw error;
    }
  }

  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(directory, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private async getProjectPath(projectName: string): Promise<string> {
    return path.join(this.contextRoot, 'projects', projectName);
  }

  private async projectExists(projectName: string): Promise<boolean> {
    const projectPath = await this.getProjectPath(projectName);
    return this.fileExists(projectPath);
  }

  private async buildContextFilePath(projectName: string, contextType: string, contextName?: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectName);
    const response = await this.getProjectConfig(projectName);
    if (!response.success || !response.config) {
      throw new Error(`getContextFilePath: Failed to load project configuration.`);
    }
    const config = response.config;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      throw new Error(`Context type '${contextType}' not found in project configuration`);
    }
    
    await this.ensureDirectoryExists(path.join(projectPath, contextType));
    
    switch (contextTypeConfig.baseType) {
      case 'templated-single-document':
      case 'freeform-single-document':
        return path.join(projectPath, contextType, `${contextType}.md`);
      case 'templated-document-collection':
      case 'freeform-document-collection':
        return path.join(projectPath, contextType, `${contextName}.md`);
      case 'templated-log':
      case 'freeform-log':
        const timestampedName = this.generateTimestampedContextName(contextType);
        return path.join(projectPath, contextType, `${timestampedName}.md`);
      default:
        throw new Error(`Invalid baseType: ${contextTypeConfig.baseType}`);
    }
  }

  private async onlyContextNamesFromDirectory(entries: { name: string; parentPath: string; isFile: () => boolean }[]): Promise<string[]> {
    return entries
      .filter(entry => entry.isFile())
      .filter(entry => entry.name.endsWith('.md'))
      .map(entry => entry.name.split('.')[0].split('/').pop())
      .filter((name): name is string => name !== undefined && name !== '');
  }

  private timestamp(): string {
    // Format: YYYY-MM-DDTHH-MM-ss-SSSZ (filesystem-friendly ISO 8601)
    return DateTime.utc().toFormat('yyyy-MM-dd\'T\'HH-mm-ss-SSS\'Z\'');
  }

  private generateTimestampedContextName(contextType: string): string {
    return `${contextType}-${this.timestamp()}`;
  }

  private getDefaultConfig(): ProjectConfig {
    return {
        "contextTypes": [
          {
            "baseType": "freeform-document-collection",
            "name": "general",
            "description": "A collection of arbitrary named contexts with no required template. Each document is stored separately and can be retrieved individually. Use get_context(\"other\", \"filename\") to read and update_context(\"other\", content, \"filename\") to create or update files.",
            "validation": false
          }
        ]
    };
  }

  private async listPathsForType(projectName: string, contextType: string): Promise<{ name: string; parentPath: string; isFile: () => boolean }[]> {
    const contextTypePath = path.join(await this.getProjectPath(projectName), contextType);
    await this.ensureDirectoryExists(contextTypePath);
    const entries = await this.readDirectory(contextTypePath, { withFileTypes: true, recursive: true }) as Dirent[];
    return entries.map(entry => ({
      name: entry.name,
      parentPath: contextTypePath,
      isFile: () => entry.isFile()
    }));
  }
  
}