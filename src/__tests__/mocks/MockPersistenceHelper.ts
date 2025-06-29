import { PersistenceHelper, PersistenceResponse, ProjectConfig } from '../../types.js';

export class MockPersistenceHelper implements PersistenceHelper {
  private projects: Map<string, ProjectConfig> = new Map();
  private contexts: Map<string, Map<string, Map<string, string[]>>> = new Map(); // project -> contextType -> contextName -> content[]
  private templates: Map<string, Map<string, string>> = new Map(); // project -> templateName -> template content

  constructor() {
    // Set up default project configuration
    this.projects.set('test-project', {
      contextTypes: [
        {
          baseType: 'templated-single-document',
          name: 'templated-single-document',
          description: 'Templated single document',
          validation: true,
          template: 'mental_model'
        },
        {
          baseType: 'freeform-single-document',
          name: 'freeform-single-document',
          description: 'Freeform single document',
          validation: false
        },
        {
          baseType: 'templated-document-collection',
          name: 'templated-document-collection',
          description: 'Templated document collection',
          validation: true,
          template: 'features'
        },
        {
          baseType: 'freeform-document-collection',
          name: 'freeform-document-collection',
          description: 'Freeform document collection',
          validation: false
        },
        {
          baseType: 'templated-log',
          name: 'templated-log',
          description: 'Templated log entries',
          validation: true,
          template: 'session_summary'
        },
        {
          baseType: 'freeform-log',
          name: 'freeform-log',
          description: 'Freeform log entries',
          validation: false
        }
      ]
    });

    // Set up default project that uses system defaults
    this.projects.set('default-config-project', {
      contextTypes: [
        {
          baseType: 'freeform-document-collection',
          name: 'general',
          description: 'Arbitrary named contexts with no template requirements',
          validation: false
        }
      ]
    });

    // Initialize empty context storage for test projects
    this.contexts.set('test-project', new Map());
    this.contexts.set('default-config-project', new Map());
  }

  async listProjects(): Promise<PersistenceResponse> {
    return {
      success: true,
      data: Array.from(this.projects.keys())
    };
  }

  async initProject(projectName: string): Promise<PersistenceResponse> {
    if (this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' already exists.`]
      };
    }

    // Create project with default general context type
    this.projects.set(projectName, {
      contextTypes: [
        {
          baseType: 'freeform-document-collection',
          name: 'general',
          description: 'Arbitrary named contexts with no template requirements',
          validation: false
        }
      ]
    });

    this.contexts.set(projectName, new Map());
    return { success: true };
  }

  async listAllContextForType(projectName: string, contextType: string): Promise<PersistenceResponse> {
    if (!this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist`]
      };
    }

    const config = this.projects.get(projectName)!;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return {
        success: false,
        errors: [`Context type '${contextType}' not found in project configuration`]
      };
    }

    const projectContexts = this.contexts.get(projectName) || new Map();
    const typeContexts = projectContexts.get(contextType) || new Map();

    // For collection types, return the list of context names
    if (contextTypeConfig.baseType.endsWith('-collection')) {
      return {
        success: true,
        data: Array.from(typeContexts.keys())
      };
    }

    // For single-document and log types, return just the context type name
    return {
      success: true,
      data: typeContexts.size > 0 ? [contextType] : []
    };
  }

  async writeContext(projectName: string, contextType: string, contextName: string, content: string): Promise<PersistenceResponse> {
    if (!this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]
      };
    }

    const config = this.projects.get(projectName)!;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return {
        success: false,
        errors: [`Context type '${contextType}' not found in project configuration`]
      };
    }

    const projectContexts = this.contexts.get(projectName) || new Map();
    const typeContexts = projectContexts.get(contextType) || new Map();

    // Handle different context type behaviors
    switch (contextTypeConfig.baseType) {
      case 'templated-single-document':
      case 'freeform-single-document':
        // Single documents always use the context type name and replace content
        typeContexts.set(contextType, [content]);
        break;

      case 'templated-document-collection':
      case 'freeform-document-collection':
        // Collections use the provided context name and replace content
        typeContexts.set(contextName, [content]);
        break;

      case 'templated-log':
      case 'freeform-log':
        // Logs append content with timestamps (simulate multiple entries)
        const existingEntries = typeContexts.get(contextType) || [];
        existingEntries.push(content);
        typeContexts.set(contextType, existingEntries);
        break;
    }

    projectContexts.set(contextType, typeContexts);
    this.contexts.set(projectName, projectContexts);

    return { success: true };
  }

  async getContext(projectName: string, contextType: string, contextNames?: string[]): Promise<PersistenceResponse> {
    if (!this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]
      };
    }

    const config = this.projects.get(projectName)!;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return {
        success: false,
        errors: [`Context type '${contextType}' not found in project configuration`]
      };
    }

    const projectContexts = this.contexts.get(projectName) || new Map();
    const typeContexts = projectContexts.get(contextType) || new Map();

    if (contextNames) {
      // Return specific contexts
      const results: string[] = [];
      for (const contextName of contextNames) {
        const content = typeContexts.get(contextName);
        if (content) {
          if (contextTypeConfig.baseType.endsWith('-log')) {
            // For logs, join multiple entries with separator
            results.push(content.join('\n\n---\n\n'));
          } else {
            // For other types, take the latest content
            results.push(content[content.length - 1]);
          }
        } else {
          // Context not found
          return {
            success: false,
            errors: [`${contextName}.md: Unknown error`]
          };
        }
      }
      return { success: true, data: results };
    } else {
      // Return all contexts for this type
      if (typeContexts.size === 0) {
        return { success: true, data: [] };
      }

      const results: string[] = [];
      for (const [contextName, content] of typeContexts.entries()) {
        if (contextTypeConfig.baseType.endsWith('-log')) {
          // For logs, join multiple entries with separator
          results.push(content.join('\n\n---\n\n'));
        } else {
          // For other types, take the latest content
          results.push(content[content.length - 1]);
        }
      }
      return { success: true, data: results };
    }
  }

  async clearContext(projectName: string, contextType: string, contextNames?: string[]): Promise<PersistenceResponse> {
    if (!this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist. Create it first using create_project.`]
      };
    }

    const config = this.projects.get(projectName)!;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig) {
      return {
        success: false,
        errors: [`Context type '${contextType}' not found in project configuration`]
      };
    }

    const projectContexts = this.contexts.get(projectName) || new Map();
    const typeContexts = projectContexts.get(contextType) || new Map();

    if (contextNames) {
      // Clear specific contexts
      for (const contextName of contextNames) {
        typeContexts.delete(contextName);
      }
    } else {
      // Clear all contexts for this type
      typeContexts.clear();
    }

    projectContexts.set(contextType, typeContexts);
    this.contexts.set(projectName, projectContexts);

    return { success: true };
  }

  async getTemplate(projectName: string, contextType: string): Promise<PersistenceResponse> {
    if (!this.projects.has(projectName)) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist`]
      };
    }

    const config = this.projects.get(projectName)!;
    const contextTypeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
    if (!contextTypeConfig || !contextTypeConfig.template) {
      return {
        success: false,
        errors: [`No template configured for ${contextType}`]
      };
    }

    // Return mock template content
    const templateContent = `# ${contextTypeConfig.template} Template\n\nMock template for ${contextType}`;
    return {
      success: true,
      data: [templateContent]
    };
  }

  async getProjectConfig(projectName: string): Promise<PersistenceResponse> {
    const config = this.projects.get(projectName);
    if (!config) {
      return {
        success: false,
        errors: [`Project '${projectName}' does not exist`]
      };
    }

    return {
      success: true,
      config: config
    };
  }

  // Test helper methods
  setProjectConfig(projectName: string, config: ProjectConfig): void {
    this.projects.set(projectName, config);
    if (!this.contexts.has(projectName)) {
      this.contexts.set(projectName, new Map());
    }
  }

  getStoredContent(projectName: string, contextType: string, contextName?: string): string[] | undefined {
    const projectContexts = this.contexts.get(projectName);
    if (!projectContexts) return undefined;
    
    const typeContexts = projectContexts.get(contextType);
    if (!typeContexts) return undefined;
    
    const key = contextName || contextType;
    return typeContexts.get(key);
  }

  hasContext(projectName: string, contextType: string, contextName?: string): boolean {
    const content = this.getStoredContent(projectName, contextType, contextName);
    return content !== undefined && content.length > 0;
  }

  reset(): void {
    this.projects.clear();
    this.contexts.clear();
    this.templates.clear();
    
    // Restore default projects
    this.__constructor();
  }

  private __constructor() {
    // Restore defaults (called by reset)
    this.projects.set('test-project', {
      contextTypes: [
        {
          baseType: 'templated-single-document',
          name: 'templated-single-document',
          description: 'Templated single document',
          validation: true,
          template: 'mental_model'
        },
        {
          baseType: 'freeform-single-document',
          name: 'freeform-single-document',
          description: 'Freeform single document',
          validation: false
        },
        {
          baseType: 'templated-document-collection',
          name: 'templated-document-collection',
          description: 'Templated document collection',
          validation: true,
          template: 'features'
        },
        {
          baseType: 'freeform-document-collection',
          name: 'freeform-document-collection',
          description: 'Freeform document collection',
          validation: false
        },
        {
          baseType: 'templated-log',
          name: 'templated-log',
          description: 'Templated log entries',
          validation: true,
          template: 'session_summary'
        },
        {
          baseType: 'freeform-log',
          name: 'freeform-log',
          description: 'Freeform log entries',
          validation: false
        }
      ]
    });

    this.projects.set('default-config-project', {
      contextTypes: [
        {
          baseType: 'freeform-document-collection',
          name: 'general',
          description: 'Arbitrary named contexts with no template requirements',
          validation: false
        }
      ]
    });

    this.contexts.set('test-project', new Map());
    this.contexts.set('default-config-project', new Map());
  }
}