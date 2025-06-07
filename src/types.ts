   import { FileSystemHelper } from "./models/context_types/utilities/fileSystem";
   import { Dirent } from 'fs';

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

   export interface PersistenceResponse {   
    success: boolean;
    content?: string;
    validation?: ValidationResponse;
    errors?: string[];
   }

   // Context Type Interface
   export interface ContextType {
    update(content: string): Promise<PersistenceResponse>;
    read(): Promise<PersistenceResponse>;
    reset(): Promise<PersistenceResponse>;
    validate(content: string): ValidationResponse;
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

export interface PersistenceHelper {
   listProjects(): Promise<string[]>;
   initProject(projectName: string): Promise<{success: boolean}>;
   listAllContextForProject(projectName: string): Promise<string[]>;
   listAllContextTypes(projectName: string): Promise<string[]>;
   writeContent(projectName: string, contextName: string, content: string): Promise<{success: boolean}>
   getContext(projectName: string, contextName: string): Promise<string>;
   archiveContext(projectName: string, contextType: string, contextName: string): Promise<{success: boolean}>
 }