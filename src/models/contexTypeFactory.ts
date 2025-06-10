import { SessionSummaryType } from './context_types/session_summary_type';
import { MentalModelType } from './context_types/mental_model_type';
import { FeaturesType } from './context_types/features_type';
import { OtherType } from './context_types/other_type';
import { FileSystemHelper } from './context_types/utilities/fileSystem';
import { ContextType } from '../types.js';

interface ContextTypeFactoryArgs {
    persistenceHelper: FileSystemHelper;
    projectName: string;
    contextType: string;
    contextName?: string;
    content?: string;
}

export const typeMap = {
    session_summary: SessionSummaryType,
    mental_model: MentalModelType,
    features: FeaturesType,
    other: OtherType
} as const;

export default function contextTypeFactory(args: ContextTypeFactoryArgs): ContextType {
    const { persistenceHelper, projectName, contextType, contextName, content } = args;
    const TypeClass = typeMap[contextType as keyof typeof typeMap];
    
    if (!TypeClass) {
        throw new Error(`Unknown context type: ${contextType}`);
    }

    return new TypeClass({
        persistenceHelper,
        projectName,
        contextName,
        content
    });
}
