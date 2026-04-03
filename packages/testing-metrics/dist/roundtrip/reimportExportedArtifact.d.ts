import { ExportArtifact } from '../../../core-export-svg/dist/types';
import { OriginalSourceRef, Project } from '../../../ir-schema/dist/index';
export interface ReimportReport {
    artifactKind: ExportArtifact['kind'];
    project: Project;
    family: string;
    hintCount: number;
    warnings: string[];
}
export declare function reimportExportedArtifact(artifact: ExportArtifact, sourceHint?: Partial<OriginalSourceRef>): ReimportReport;
//# sourceMappingURL=reimportExportedArtifact.d.ts.map