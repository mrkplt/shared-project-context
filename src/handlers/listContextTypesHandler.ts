import { FileSystemHelper } from '../models/context_types/utilities/fileSystem';
import { ContentItem } from '../types';
import { typeMap } from '../models/contexTypeFactory';
import { OtherType } from '../models/context_types/other_type';

interface ListcontextTypesArgs {
  projectName: string;
}

class ListcontextTypesHandler {
  private fsHelper: FileSystemHelper;
  
  constructor(
    fsHelper: FileSystemHelper,
  ) {
    this.fsHelper = fsHelper;
  }

  async handle(args: ListcontextTypesArgs): Promise<{ content: ContentItem[] }> {
    try {
      const contextTypes = Object.values(typeMap).map(type => {
        if (type.name !== 'other') return [type.name]
        return new OtherType(
          {
            persistenceHelper: this.fsHelper,
            projectName: args.projectName,
            contextName: "undefined"
          }
        ).listAllContext();
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(contextTypes)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list context types: ${errorMessage}`);
    }
  };
}

export default ListcontextTypesHandler;