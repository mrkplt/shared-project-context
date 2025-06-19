import { ContexTypeResponse } from '../../types.js';
import { BaseContextType } from './baseContextType.js';

export class TemplatedLogType extends BaseContextType {
  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: [`Content is required to update ${this.config.name}`]
      };
    }

    // For templated logs, append with timestamp (no reset)
    const result = await this.persistenceHelper.writeContext(
      this.projectName,
      this.config.name,
      this.config.name,
      this.content
    );
    
    return result.success ? { success: true } : { success: false, errors: result.errors };
  }

  async read(): Promise<ContexTypeResponse> {
    const allContextsResult = await this.getAllContexts();

    const contextResult = await this.persistenceHelper.getContext(
      this.projectName,
      this.config.name,
      allContextsResult
    );

    if (!contextResult.success) {
      return { success: false, errors: contextResult.errors };
    }

    return { success: true, content: contextResult.data?.join('\n\n---\n\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    const allContextsResult = await this.getAllContexts();

    const result = await this.persistenceHelper.archiveContext(
      this.projectName,
      this.config.name,
      allContextsResult
    );

    return result.success ? { success: true } : { success: false, errors: result.errors };
  }

  private async getAllContexts(): Promise<string[]> {
    const allContextsResult = await this.persistenceHelper.listAllContextForProject(this.projectName);
    
    if (!allContextsResult.success || !allContextsResult.data) {
      throw new Error(`Failed to list all contexts: ${allContextsResult.errors?.join(', ')}`);
    }

    return allContextsResult.data
      .filter((contextName) => contextName && contextName.startsWith(this.config.name))
      .sort((a: string, b: string) => { return b.localeCompare(a) });
  }
}