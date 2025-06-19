import { ContexTypeResponse } from '../../types.js';
import { BaseContextType } from './baseContextType';

export class TemplatedDocumentType extends BaseContextType {
  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: [`Content is required to update ${this.config.name}`]
      };
    }

    // For templated documents, reset first then write (replace behavior)
    const resetResult = await this.reset();
    if (!resetResult.success) {
      return {
        success: false,
        errors: resetResult.errors
      };
    }

    const result = await this.persistenceHelper.writeContext(
      this.projectName,
      this.config.name,
      this.config.name,
      this.content
    );
    
    return result.success ? { success: true } : { success: false, errors: result.errors };
  }

  async read(): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.getContext(
      this.projectName,
      this.config.name,
      [this.config.name]
    );

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    return { success: true, content: result.data?.join('\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    const result = await this.persistenceHelper.archiveContext(
      this.projectName,
      this.config.name,
      [this.config.name]
    );

    return result.success ? { success: true } : { success: false, errors: result.errors };
  }
}