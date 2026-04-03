
import { Project } from '../../../ir-schema/dist/index';

export function buildHtmlExportReport(project: Project) {
  const objects = Object.values(project.project.objects);
  return {
    stableObjects: objects.filter(o => o.stability.exportStabilityClass === 'stable').length,
    fragileObjects: objects.filter(o => o.stability.exportStabilityClass === 'fragile').length,
    snapshotObjects: objects.filter(o => o.stability.requiresSnapshotRendering).length,
  };
}
