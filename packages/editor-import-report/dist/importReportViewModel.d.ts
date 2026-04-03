import { Project } from '../../ir-schema/dist/index';
export interface ImportReportViewModel {
    importId: string;
    sourceId: string;
    familyClassifiedAs: string;
    liftSuccessCount: number;
    liftFailureCount: number;
    unknownObjectCount: number;
    atomicRasterCount: number;
    manualAttentionRequired: string[];
}
export declare function buildLatestImportReport(project: Project): ImportReportViewModel | null;
//# sourceMappingURL=importReportViewModel.d.ts.map