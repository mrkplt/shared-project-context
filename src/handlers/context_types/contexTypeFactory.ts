import {SessionSummaryType} from './session_summary';
import {MentalModelType} from './mental_model';
import {FeaturesType} from './features';
import {OtherType} from './other';
import { FileSystemHelper } from '../utilities/fileSystem.js';
import { ContextType } from '../../types.js';

interface ContextTypeFactoryArgs {
    projectName: string,
    persistenceHelper: FileSystemHelper,
    contextType: string
}

const typeMap = {
    session_summary: SessionSummaryType,
    mental_model: MentalModelType,
    features: FeaturesType,
    other: OtherType
} as const;

export function ContextTypeFactory(args:ContextTypeFactoryArgs):ContextType {
    const { projectName, persistenceHelper, contextType } = args;
    const TypeClass = typeMap[contextType as keyof typeof typeMap];
    return new TypeClass(projectName, persistenceHelper);
}
