import { Project } from '../../ir-schema/dist/index';
export interface CapabilityResult {
    project: Project;
    warnings: string[];
}
export declare function assignCapabilities(project: Project): CapabilityResult;
//# sourceMappingURL=assignCapabilities.d.ts.map