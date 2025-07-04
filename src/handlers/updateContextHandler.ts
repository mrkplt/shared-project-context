import { FileSystemHelper } from '../models/context_types/utilities/fileSystem.js';
import  ContextTypeFactory from '../models/contexTypeFactory.js';
import { ContentItem, ValidationError } from '../types.js';

interface UpdateContextArgs {
  projectName: string;
  contextType: string;
  content: string;
  contextName?: string; // For 'other' type files
}

class UpdateContextHandler {
  private persistenceHelper: FileSystemHelper;

  constructor(
    persistenceHelper: FileSystemHelper 
  ) {
    this.persistenceHelper = persistenceHelper;
  }

  async handle(args: UpdateContextArgs): Promise<{ content: ContentItem[] }> {
    
    const contextType = await ContextTypeFactory({
      projectName: args.projectName,
      persistenceHelper: this.persistenceHelper,
      contextType: args.contextType,
      contextName: args.contextName,
      content: args.content
    });

    // Validate content for all context types
    const validationResult = await contextType.validate();
    
    if (!validationResult.isValid) {
      const errorMessages = [
        'Validation failed:',
        ...(validationResult.validationErrors?.map((e: ValidationError) => `- ${e.message}`) || []),
        '',
        'Correction guidance:',
        ...(validationResult.correctionGuidance || [])
      ];
      
      // Only include template information for core types that support template validation

      const response = await this.persistenceHelper.getProjectConfig(args.projectName);
      if (!response.success || !response.config) {
        return {
          content: [
            { type: 'text', text: 'UpdateContextHandler: Failed to load project configuration.' },
            { type: 'text', text: response.errors?.join(', ') || 'Unknown error' }
          ]
        }
      }

      const templateContextTypes = response.config.contextTypes.filter(ct => ct.template).map(ct => ct.name);

      if (templateContextTypes.includes(args.contextType) && validationResult.templateUsed) {
        errorMessages.push(
          '',
          'Template used for validation:',
          '```markdown',
          validationResult.templateUsed,
          '```'
        );
      }
      
      return {
        content: [{
          type: 'text',
          text: errorMessages.join('\n')
        }]
      };
    }

    const result = await contextType.update()
  
    if (result.success) {  
      return {
        content: [{
          type: 'text',
          text: 'Context updated successfully'
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: result.errors?.join('\n') || 'An unknown error occurred'
      }]
    };
  }
}

export default UpdateContextHandler;