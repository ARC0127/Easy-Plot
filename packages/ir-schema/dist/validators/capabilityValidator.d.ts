import type { Project } from '../index';
export interface CapabilityIssue {
    code: string;
    objectId: string;
    message: string;
}
export declare function validateCapabilityConflicts(project: Project): CapabilityIssue[];
//# sourceMappingURL=capabilityValidator.d.ts.map