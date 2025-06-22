import { TemplatedSingleDocument } from './context_types/templatedSingleDocument.js';
import { FreeformSingleDocument } from './context_types/freeformSingleDocument.js';
import { TemplatedDocumentCollection } from './context_types/templatedDocumentCollection.js';
import { FreeformDocumentCollection } from './context_types/freeformDocumentCollection.js';
import { TemplatedLog } from './context_types/templatedLog.js';
import { FreeformLog } from './context_types/freeformLog.js';
import { FileSystemHelper } from './context_types/utilities/fileSystem.js';
import { ContextType, ContextTypeArgs, TypeConfig } from '../types.js';

interface ContextTypeFactoryArgs {
    persistenceHelper: FileSystemHelper;
    projectName: string;
    contextType: string;
    contextName?: string;
    content?: string;
}

type BaseContextTypeConstructor = new (args: ContextTypeArgs, config: TypeConfig) => ContextType;

const baseTypeMap = new Map<string, BaseContextTypeConstructor>([
    ['templated-single-document', TemplatedSingleDocument as BaseContextTypeConstructor],
    ['freeform-single-document', FreeformSingleDocument as BaseContextTypeConstructor],
    ['templated-document-collection', TemplatedDocumentCollection as BaseContextTypeConstructor],
    ['freeform-document-collection', FreeformDocumentCollection as BaseContextTypeConstructor],
    ['templated-log', TemplatedLog as BaseContextTypeConstructor],
    ['freeform-log', FreeformLog as BaseContextTypeConstructor]
]);

export default async function contextTypeFactory(args: ContextTypeFactoryArgs): Promise<ContextType> {
    const { persistenceHelper, projectName, contextType, contextName, content } = args;
    
    // Load project configuration
    const response = await persistenceHelper.getProjectConfig(projectName);
    if (!response.success || !response.config) {
        throw new Error(`Failed to load project configuration. ${response.errors?.join(', ') || 'Unknown error'}`);
    }
    // Find the context type configuration
    const typeConfig = response.config.contextTypes.find(ct => ct.name === contextType);
    
    if (!typeConfig) {
        throw new Error(`Unknown context type: ${contextType}`);
    }
    
    // Get the base type class
    const BaseClass = baseTypeMap.get(typeConfig.baseType);
    
    if (!BaseClass) {
        throw new Error(`Unknown base type: ${typeConfig.baseType}`);
    }
    
    // Create instance with configuration
    return new BaseClass(
        { persistenceHelper, projectName, contextName, content },
        typeConfig
    );
}
