"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHtmlExportReport = buildHtmlExportReport;
function buildHtmlExportReport(project) {
    const objects = Object.values(project.project.objects);
    return {
        stableObjects: objects.filter(o => o.stability.exportStabilityClass === 'stable').length,
        fragileObjects: objects.filter(o => o.stability.exportStabilityClass === 'fragile').length,
        snapshotObjects: objects.filter(o => o.stability.requiresSnapshotRendering).length,
    };
}
