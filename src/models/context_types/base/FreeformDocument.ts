import { ContexTypeResponse } from '../../../types.js';
import { BaseContextType } from './BaseContextType.js';

export class FreeformDocument extends BaseContextType {
  async update(): Promise<ContexTypeResponse> {
    if (!this.content) {
      return {
        success: false,
        errors: [`Content is required to update ${this.config.name}`]
      };
    }

    if (!this.contextName) {
      return {
        success: false,
        errors: [`Context name is required for ${this.config.name} type`]
      };
    }

    const result = await this.persistenceHelper.writeContext(
      this.projectName,
      this.config.name,
      this.contextName,
      this.content
    );
    
    return result.success ? { success: true } : { success: false, errors: result.errors };
  }

  async read(): Promise<ContexTypeResponse> {
    if (!this.contextName) {
      return {
        success: false,
        errors: [`Context name is required to read ${this.config.name} type`]
      };
    }

    const result = await this.persistenceHelper.getContext(
      this.projectName,
      this.config.name,
      [this.contextName]
    );

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    return { success: true, content: result.data?.join('\n') || '' };
  }

  async reset(): Promise<ContexTypeResponse> {
    if (!this.contextName) {
      return {
        success: false,
        errors: [`Context name is required to reset ${this.config.name} type`]
      };
    }

    const result = await this.persistenceHelper.archiveContext(
      this.projectName,
      this.config.name,
      [this.contextName]
    );

    return result.success ? { success: true } : { success: false, errors: result.errors };
  }
}