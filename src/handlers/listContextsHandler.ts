import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';
import { typeMap } from '../models/contexTypeFactory';
import { OtherType } from '../models/context_types/other_type';

interface ListContextsArgs {
  projectName: string;
}

class ListContextsHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
  ) {
    this.fsHelper = fsHelper;
  }

async handle(args: ListContextsArgs): Promise<{ content: ContentItem[] }> {
  try {
    // Get all standard context types (excluding 'other')
    const standardTypes = Object.keys(typeMap).filter(key => key !== 'other');
    
    // Handle 'other' type if it exists
    let otherContexts: string[] = [];
    if (typeMap.other) {
      const otherType = new OtherType({
        persistenceHelper: this.fsHelper,
        projectName: args.projectName,
        contextName: 'undefined' // Empty string or appropriate default
      });
      
      const result = await otherType.listAllContext();
      if (!result.success) {
        return { content: [{
          type: 'text',
          text: result.errors?.join('\n') || 'An unknown error occurred'
        }]};
      }

      otherContexts = result.success && result.data ? result.data : [];
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify([...standardTypes, ...otherContexts])
      }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list context types: ${errorMessage}`);
  }
}
}

export default ListContextsHandler;