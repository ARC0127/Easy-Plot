import type { Project } from '../project';
export interface ValidationIssue {
    code: string;
    level: 'error' | 'warning';
    objectId?: string;
    message: string;
}
export interface ValidationReport {
    ok: boolean;
    issues: ValidationIssue[];
}
export declare function validateInvariants(project: Project): ValidationReport;
//# sourceMappingURL=invariantValidator.d.ts.map