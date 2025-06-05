   import { FileSystemHelper } from "./handlers/utilities/fileSystem";

   // Validation Response Types
   export interface ValidationResponse {
    isValid: boolean;
    validationErrors?: string[];
    correctionGuidance?: string[];
   }

   export interface PersistenceResponse {   
    success: boolean;
    validation?: ValidationResponse;
    error?: string;
   }

   export interface ReadResponse {
    success: boolean;
    content: string;
    error?: string;
   }
    

   // Context Type Interface
   export interface ContextType {
    update(content: string, name?: string): Promise<PersistenceResponse>;
    read(name?: string): Promise<PersistenceResponse>;
    reset(name?: string): Promise<PersistenceResponse>;
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