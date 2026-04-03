"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLatestImportReport = buildLatestImportReport;
function buildLatestImportReport(project) {
    const rec = project.project.importRecords.at(-1);
    if (!rec)
        return null;
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
