
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

export function buildLatestImportReport(project: Project): ImportReportViewModel | null {
  const rec = project.project.importRecords.at(-1);
  if (!rec) return null;
  return {
    importId: rec.importId,
    sourceId: rec.sourceId,
    familyClassifiedAs: rec.familyClassifiedAs,
    liftSuccessCount: rec.liftSuccesses.length,
    liftFailureCount: rec.liftFailures.length,
    unknownObjectCount: rec.unknownObjects.length,
    atomicRasterCount: rec.atomicRasterObjects.length,
    manualAttentionRequired: [...rec.manualAttentionRequired],
  };
}
