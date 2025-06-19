import { Dirent } from 'fs';
import * as os from 'os';
import * as path from 'path';
import fs from 'fs/promises';
import { PersistenceHelper, ProjectConfig, TypeConfig } from '../../../types.js';
import { PersistenceResponse } from '../../../types.js';
const { DateTime } = require('luxon');

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
      await this.ensureDirectoryExists(this.contextRoot);
      const entries = await this.readDirectory( path.join(this.contextRoot, 'projects'), { withFileTypes: true }) as Dirent[];
      return { success: true, data: entries.filter(entry => entry.isDirectory()).map(entry => entry.name) };
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  async listAllContextForProject(projectName: string): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    try {
      const response = await this.getProjectConfig(projectName);
      if (!response.success || !response.config) {
        return { success: false, errors: [`Failed to load project configuration.`] };
      }
      const config = response.config;
      const contextTypeNames = config.contextTypes.map(ct => ct.name);
      
      const entries = await Promise.all(contextTypeNames.map(async typeName => {
        const contextTypePath = path.join(projectPath, typeName);
        await this.ensureDirectoryExists(contextTypePath);
        return await this.readDirectory(contextTypePath, { withFileTypes: true, recursive: true }) as Dirent[];
      }))

      return { success: true, data: await this.onlyContextNamesFromDirectory(entries.flat()) }
    } catch (error) {
      const errorMessage = ( error instanceof Error ? error.message : 'Unknown error');
      return { success: false, errors: [errorMessage] };
    }
  }

  // This is used for templated-log and freeform-log context types
  async getAllContextForType(projectName: string, contextType: string): Promise<PersistenceResponse> {
    if (!await this.contextTypeIsReal(projectName, contextType)) {
      return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
    }

    if (!await this.projectExists(projectName)) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    try {
      const contextTypePath = path.join(await this.getProjectPath(projectName), contextType);
      await this.ensureDirectoryExists(contextTypePath);
      
      const dirEntries = await this.readDirectory(contextTypePath, { withFileTypes: true, recursive: true }) as Dirent[];
      const filePaths = dirEntries.filter(entry => entry.isFile()).map(entry => entry.name);

      // Read all files concurrently
      const fileReadPromises = filePaths.map(async (filePath, index) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { content, error: null, name: contextType };
        } catch (error) {
          if (
            error instanceof Error 
            && (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            const configResponse = await this.getProjectConfig(projectName);
            if (!configResponse.success || !configResponse.config) {
              return { success: false, errors: [`Failed to load project configuration.`] };
            }

            const config = configResponse.config;
            const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
            
            if (!contextTypeConfig) {
              return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
            }
            
            const shouldReturnEmpty = this.shouldReturnEmptyForMissingFile(contextTypeConfig);
            
            if (shouldReturnEmpty) {
              return { content: '', error: null, name: contextType };
            } else {
              return { content: null, error: 'Context not found. Have you created it using create_context yet?', name: contextType };
            }
          }
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { content: null, error: errorMessage, name: contextType };
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

      const data = sortedResults.map(result => result.content!);

      return { success: true, data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }
  
  // This is explicitly requires the contextName to be specified. 
  // This is used freeform-document and templated-document context types
  async getContext(projectName: string, contextType: string, contextNames: string[]): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, contextType));

    try {
      const response = await this.getProjectConfig(projectName);
      if (!response.success || !response.config) {
        return { success: false, errors: [`Failed to load project configuration.`] };
      }
      const config = response.config;
      const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
      
      if (!contextTypeConfig) {
        return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
      }

      const filePathPromises = contextNames.map(name => 
        this.getContextFilePath(projectName, contextType, name)
      );
      const filePaths = await Promise.all(filePathPromises);
      
      // Read all files concurrently
      const fileReadPromises = filePaths.map(async (filePath, index) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { content, error: null, name: contextNames[index] };
        } catch (error) {
          if (
            error instanceof Error 
            && (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            // Use configuration to determine missing file behavior
            const shouldReturnEmpty = this.shouldReturnEmptyForMissingFile(contextTypeConfig);
            
            if (shouldReturnEmpty) {
              return { content: '', error: null, name: contextNames[index] };
            } else {
              return { content: null, error: 'Context not found. Have you created it using create_context yet?', name: contextNames[index] };
            }
          }
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { content: null, error: errorMessage, name: contextNames[index] };
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
        return { success: false, errors: [`Failed to load project configuration.`] };
      }
      const config = response.config;
      const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
      
      if (!contextTypeConfig) {
        return { success: false, errors: [`Context type '${contextType}' not found in project configuration`] };
      }

      const fileName = contextTypeConfig.fileNaming === 'timestamped'
        ? this.generateTimestampedContextName(contextName) 
        : contextName;
     
      const filePath = await this.getContextFilePath(projectName, contextType, fileName);
      
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
        return { success: false, errors: [`Failed to load project configuration.`] };
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
          const repositoryRoot = path.resolve(__dirname, '../../../..');
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

  async archiveContext(projectName: string, contextType: string, contextNames: string[]): Promise<PersistenceResponse> {
    const projectPath = await this.getProjectPath(projectName);
    if (!(await this.fileExists(projectPath))) {
      return {success: false, errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]};
    }

    await this.ensureDirectoryExists(path.join(projectPath, 'archive', contextType));

    try {
      const projectPath = await this.getProjectPath(projectName);
      const timestamp = this.timestamp();
      const archiveDir = path.join(projectPath, 'archive', contextType, timestamp);
      
      // Ensure the archive directory exists
      await this.ensureDirectoryExists(archiveDir);
      
      // Process each context name
      const movePromises = contextNames.map(async (contextName) => {
        try {
          // Get the source file path
          const sourceFilePath = await this.getContextFilePath(projectName, contextType, contextName);
          
          if (!(await this.fileExists(sourceFilePath))) {
            return { success: true, name: contextName };
          }

          // Get the filename from the source path
          const fileName = path.basename(sourceFilePath);
          
          // Create destination path in archive directory
          const destinationPath = path.join(archiveDir, fileName);
          
          // Move the file to archive
          await fs.rename(sourceFilePath, destinationPath);
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, name: contextName, error: errorMessage };
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
    const configPath = path.join(projectPath, 'context-config.json');
    
    let config: ProjectConfig;
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      // Return default configuration if config file doesn't exist
      config = this.getDefaultConfig();
    }
    
    // Cache the configuration
    this.configCache.set(projectName, config);
    return { success: true, config: config };
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

  private async contextTypeIsReal(projectName: string, contextType: string): Promise<boolean> {
    const response = await this.getProjectConfig(projectName);
    if (!response.success || !response.config) {
      return false;
    }
    const config = response.config;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    return !!contextTypeConfig;
  }

  private async projectExists(projectName: string): Promise<boolean> {
    const projectPath = await this.getProjectPath(projectName);
    return this.fileExists(projectPath);
  }

  private async getContextFilePath(projectName: string, contextType: string, contextName?: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectName);
    const response = await this.getProjectConfig(projectName);
    if (!response.success || !response.config) {
      throw new Error(`Failed to load project configuration.`);
    }
    const config = response.config;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      throw new Error(`Context type '${contextType}' not found in project configuration`);
    }
    
    await this.ensureDirectoryExists(path.join(projectPath, contextType));
    
    switch (contextTypeConfig.fileNaming) {
      case 'timestamped':
      case 'named':
        return path.join(projectPath, contextType, `${contextName}.md`);
      case 'single':
        return path.join(projectPath, contextType, `${contextType}.md`);
      default:
        throw new Error(`Invalid fileNaming type: ${contextTypeConfig.fileNaming}`);
    }
  }

  private async onlyContextNamesFromDirectory(entries: Dirent[]): Promise<string[]> {
    return entries
      .filter(entry => entry.isFile())
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

  // Helper method to determine missing file behavior based on config
  private shouldReturnEmptyForMissingFile(contextTypeConfig: TypeConfig): boolean {
    // Templated types (both log and document) should return empty for missing files
    // Freeform types should return error for missing files
    return contextTypeConfig.baseType === 'templated-log' || contextTypeConfig.baseType === 'templated-document';
  }

  private getDefaultConfig(): ProjectConfig {
    return {
      contextTypes: [
        {
          baseType: 'templated-log',
          name: 'session_summary',
          description: 'Append-only log of development sessions. Each entry is timestamped and follows the session_summary template. Use get_context("session_summary") to read all entries chronologically, and update_context("session_summary", content) to append a new entry.',
          template: 'session_summary',
          fileNaming: 'timestamped',
          validation: true
        },
        {
          baseType: 'templated-document',
          name: 'mental_model',
          description: 'Single document tracking current technical architecture understanding. Replaces on update. Must follow the mental_model template. Use get_context("mental_model") to read and update_context("mental_model", content) to replace.',
          template: 'mental_model',
          fileNaming: 'single',
          validation: true
        },
        {
          baseType: 'templated-document',
          name: 'features',
          description: 'Single document tracking implementation status. Replaces on update. Must follow the features template. Use get_context("features") to read and update_context("features", content) to replace.',
          template: 'features',
          fileNaming: 'single',
          validation: true
        },
        {
          baseType: 'freeform-document',
          name: 'other',
          description: 'Arbitrary named files for reference documents. No template required. Use get_context("other", "filename") to read and update_context("other", content, "filename") to create or update files.',
          fileNaming: 'named',
          validation: false
        }
      ]
    };
  }
}