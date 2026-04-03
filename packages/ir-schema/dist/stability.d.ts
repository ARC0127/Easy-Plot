import type { EquivalenceTarget, ExportStabilityClass, ReimportExpectation } from './enums';
export interface StabilityProfile {
    exportStabilityClass: ExportStabilityClass;
    requiresSnapshotRendering: boolean;
    reimportExpectation: ReimportExpectation;
    equivalenceTarget: EquivalenceTarget;
}
//# sourceMappingURL=stability.d.ts.map