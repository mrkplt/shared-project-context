import { TemplatedDocument } from './context_types/base/TemplatedDocument.js';
import { FreeformDocument } from './context_types/base/FreeformDocument.js';
import { TemplatedLog } from './context_types/base/TemplatedLog.js';
import { Log } from './context_types/base/Log.js';
import { FileSystemHelper } from './context_types/utilities/fileSystem.js';
import { ContextType, ContextTypeArgs, BaseTypeConfig } from '../types.js';

interface ContextTypeFactoryArgs {
    persistenceHelper: FileSystemHelper;
    projectName: string;
    contextType: string;
    contextName?: string;
    content?: string;
}

type BaseContextTypeConstructor = new (args: ContextTypeArgs, config: BaseTypeConfig) => ContextType;

const baseTypeMap = new Map<string, BaseContextTypeConstructor>([
    ['templated-document', TemplatedDocument],
    ['freeform-document', FreeformDocument],
    ['templated-log', TemplatedLog],
    ['log', Log]
]);

export default async function contextTypeFactory(args: ContextTypeFactoryArgs): Promise<ContextType> {
    const { persistenceHelper, projectName, contextType, contextName, content } = args;
    
    // Load project configuration
    const config = await persistenceHelper.getProjectConfig(projectName);
    
    // Find the context type configuration
    const typeConfig = config.contextTypes.find(ct => ct.name === contextType);
    
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

// Keep the old typeMap for backward compatibility in FileSystemHelper
export const typeMap = {
    session_summary: 'session_summary',
    mental_model: 'mental_model',
    features: 'features',
    other: 'other'
} as const;
