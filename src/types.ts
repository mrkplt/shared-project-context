   import { FileSystemHelper } from "./models/context_types/utilities/fileSystem.js";

   //Used in Handlers
   export interface ContentItem {
    type: string;
    text: string;
  }

  // Used in Context Types
   // Validation Response Types
   export interface ValidationResponse {
    isValid: boolean;
    validationErrors?: ValidationError[];
    correctionGuidance?: string[];
    templateUsed?: string;
   }

   export interface ValidationError {
    type: 'missing_header' | 'incorrect_structure' | 'invalid_format' | 'content_error';
    section?: string;
    message: string;
    line?: number;
   }


   export interface ContextTypeArgs {
      persistenceHelper: FileSystemHelper,
      projectName: string,
      contextName?: string,
      content?: string
   }
    
   export interface ContexTypeResponse {   
    success: boolean;
    content?: string;
    validation?: ValidationResponse;
    errors?: string[];
   }

   // Context Type Interface
   export interface ContextType {
      update(): Promise<ContexTypeResponse>;
      read(): Promise<ContexTypeResponse>;
      reset(): Promise<ContexTypeResponse>;
      validate(): Promise<ValidationResponse>;
      persistenceHelper: FileSystemHelper;
   }

export interface PersistenceResponse {
   success: boolean;
   data?: string[];
   errors?: string[];
   config?: ProjectConfig;
}

export interface PersistenceHelper {
   listProjects(): Promise<PersistenceResponse>;
   initProject(projectName: string): Promise<PersistenceResponse>;
   listAllContextForType(projectName: string, contextType: string): Promise<PersistenceResponse>;
   writeContext(projectName: string, contextType: string, contextName: string, content: string): Promise<PersistenceResponse>
   getContext(projectName: string, contextType: string, contextName: string[]): Promise<PersistenceResponse>;
   clearContext(projectName: string, contextType: string, contextName: string[]): Promise<PersistenceResponse>;
   getTemplate(projectName: string, contextType: string): Promise<PersistenceResponse>;
   getProjectConfig(projectName: string): Promise<PersistenceResponse>;
}

// Configuration system types
export interface TypeConfig {
  baseType: 'templated-single-document' | 'freeform-single-document' | 
           'templated-document-collection' | 'freeform-document-collection' |
           'templated-log' | 'freeform-log';
  name: string;
  description: string;
  template?: string;
  validation?: boolean;
}

export interface ProjectConfig {
  contextTypes: TypeConfig[];
}