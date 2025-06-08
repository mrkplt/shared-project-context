   import { FileSystemHelper } from "./models/context_types/utilities/fileSystem";

   //Used in Handlers
   export interface ContentItem {
    type: string;
    text: string;
  }

  // Used in Context Types
   // Validation Response Types
   export interface ValidationResponse {
    isValid: boolean;
    validationErrors?: string[];
    correctionGuidance?: string[];
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
      validate(): ValidationResponse;
      persistenceHelper: FileSystemHelper;
   }

//    {validationErrors: [{
// },
// correction_guidance: {
// primary_issue: 'Missing filename parameter',
// step_by_step_fix: [
//   '1. Provide a descriptive filename for your content',
//   '2. Use format: update_context("other", content, "your-filename")',
//   '3. Avoid spaces and special characters in filename'
// ],
// template_reference: 'Other type files require explicit naming',
// retry_instructions: 'Call update_context("other", content, name) with a valid filename'
// }

export interface PersistenceResponse {
   success: boolean;
   data?: string[];
   errors?: string[];
}

export interface PersistenceHelper {
   listProjects(): Promise<PersistenceResponse>;
   initProject(projectName: string): Promise<PersistenceResponse>;
   listAllContextForProject(projectName: string): Promise<PersistenceResponse>;
   listAllContextTypes(projectName: string): Promise<PersistenceResponse>;
   writeContext(projectName: string, contextType: string, contextName: string, content: string): Promise<PersistenceResponse>
   getContext(projectName: string, contextType: string, contextName: string): Promise<PersistenceResponse>;
   archiveContext(projectName: string, contextType: string, contextName: string): Promise<PersistenceResponse>
}