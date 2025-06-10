import { ValidationResponse, ContextType, ContexTypeResponse, PersistenceResponse, ContextTypeArgs } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class OtherType implements ContextType {
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly contextName: string | undefined;
  private readonly content: string | undefined;

  constructor(args: ContextTypeArgs) {
    this.persistenceHelper = args.persistenceHelper;
    this.projectName = args.projectName;
    this.contextName = args.contextName;
    this.content = args.content;
  }


  // BUG: SOmewhere in the call stack we are assigning contextType to 
  // ContextName and not failing if ContextName is not present
  async update(): Promise<ContexTypeResponse> {
    if (!this.contextName) {
      return {
        success: false,
        errors: ['Context name is required to update other type']
      };
    }
    if (!this.content) {
      return {
        success: false,
        errors: ['Content is required to update other type']
      };
    }
    const result = await this.persistenceHelper.writeContext(
      this.projectName, 
      'other', 
      this.contextName,
      this.content
    );
    
    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }
    return {
      success: true
    };
  }

  async read(): Promise<ContexTypeResponse> {
    if (!this.contextName) {
      return {
        success: false,
        errors: ['Context name is required to read other type']
      };
    }

    const result = await this.persistenceHelper.getContext(
      this.projectName, 
      'other', 
      [this.contextName]
    );
    
    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }
    return {
      success: true,
      content: result.data?.join('\n') || ''
    };
  }

  async reset(): Promise<ContexTypeResponse> {
    if (!this.contextName) {
      return {
        success: false,
        errors: ['Name parameter is required for other type']
      };
    }
  
    const result = await this.persistenceHelper.archiveContext(
      this.projectName, 
      'other', 
      [this.contextName]
    );
    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }
    return {
      success: true
    };
  }

  validate(): ValidationResponse {
    if (!this.content) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 'Content is required to validate other type', 'error'
        ],
        correctionGuidance: [
          '1. Add meaningful content to your file',
          '2. Include relevant information for your use case',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    const trimmedContent = this.content.trim();
     
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 'Content cannot be empty', 'error'
        ],
        correctionGuidance: [
          '1. Add meaningful content to your file',
          '2. Include relevant information for your use case',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }

  async listAllContext(): Promise<PersistenceResponse> {
    const result = await this.persistenceHelper.listAllContextForProject(this.projectName);
    if (!result.success || !result.data) {
      return {
        success: false,
        errors: result.errors
      };
    }
    return {
      success: true,
      data: result.data.filter(name => 
        !(name.startsWith('session_summary') 
        || name === 'mental_model' 
        || name === 'features')
      )
    };
  }
}