import { ValidationResponse, ContextType, ContexTypeResponse, ContextTypeArgs } from '../../types.js';
import { FileSystemHelper } from './utilities/fileSystem.js';

export class SessionSummaryType implements ContextType {
  public readonly persistenceHelper: FileSystemHelper;
  private readonly projectName: string;
  private readonly contextType: string;
  private content: string | undefined;

  constructor(args: ContextTypeArgs) {
    this.persistenceHelper = args.persistenceHelper;
    this.projectName = args.projectName;
    this.contextType = 'session_summary';
    this.content = args.content;
  }

  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: ['Content is required to update session summary']
      };
    }

    const result = await this.persistenceHelper.writeContext(
      this.projectName, 
      'session_summary', 
      'session_summary',
      this.content
    );
     
    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }

    return { success: true };
  }

  async read(): Promise<ContexTypeResponse> {
    const allContextsResult = await this.getAllContexts();

    const contextResult = await this.persistenceHelper.getContext(
      this.projectName,
      'session_summary',
      allContextsResult
    );

    if (!contextResult.success) {
      return {
        success: false,
        errors: contextResult.errors
      };
    }

    return { success: true, content: contextResult.data?.join('\n\n---\n\n') };
  }

  async reset(): Promise<ContexTypeResponse> {
    const allContextsResult = await this.getAllContexts();

    const result = await this.persistenceHelper.archiveContext(
      this.projectName,
      'session_summary',
      allContextsResult
    );

    if (!result.success) {
      return {
        success: false,
        errors: result.errors
      };
    }

    return { success: true };
  }

  validate(): ValidationResponse {
    const trimmedContent = this.content?.trim() || '';
    
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        validationErrors: [
          'insufficient_content', 
          'Session summary cannot be empty', 
          'error'
        ],
        correctionGuidance: [
          '1. Add a summary of the session',
          '2. Include key decisions, changes, and next steps',
          '3. Ensure content is not just whitespace'
        ]
      };
    }
    
    return { isValid: true };
  }

  private async getAllContexts(): Promise<string[]> {
    const allContextsResult = await this.persistenceHelper.listAllContextForProject(this.projectName);
    
    if (!allContextsResult.success || !allContextsResult.data) {
      throw new Error(`Failed to list all contexts: ${allContextsResult.errors?.join(', ')}`);
    }

    return allContextsResult.data
      .filter((contextName) => contextName.startsWith('session_summary'))
      .sort((a: string, b: string) => { return b.localeCompare(a) });
  }
}