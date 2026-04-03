import { validateCapabilityConflicts, validateInvariants, validateProject } from '../../../ir-schema/dist/index';
import { EditorSessionState } from '../types';
export interface CombinedValidationReport {
    schema: ReturnType<typeof validateProject>;
    invariants: ReturnType<typeof validateInvariants>;
    capabilities: ReturnType<typeof validateCapabilityConflicts>;
    ok: boolean;
}
export declare function validateCurrentProject(state: EditorSessionState): CombinedValidationReport;
//# sourceMappingURL=validationActions.d.ts.map