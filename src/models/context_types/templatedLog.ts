import { ContexTypeResponse } from '../../types.js';
import { BaseContextType } from './baseContextType.js';

export class TemplatedLog extends BaseContextType {
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
    const contextResult = await this.persistenceHelper.getContext(
      this.projectName,
      this.config.name
    );

    if (!contextResult.success) {
      return { success: false, errors: contextResult.errors };
    }

    return { success: true, content: contextResult.data?.join('\n\n---\n\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.clearContext(
      this.projectName,
      this.config.name
    );

    return result.success ? { success: true } : { success: false, errors: result.errors };
  }
}