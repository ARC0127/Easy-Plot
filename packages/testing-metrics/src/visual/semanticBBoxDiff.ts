
import { AnyObject, Project } from '../../../ir-schema/dist/index';
import { VisualEquivalenceReport } from '../reports/types';

function semanticObjects(project: Project): AnyObject[] {
  return Object.values(project.project.objects).filter(o => ['panel', 'legend', 'annotation_block', 'figure_title', 'panel_label'].includes(o.objectType));
}

export function computeSemanticBBoxDiff(before: Project, after: Project): Pick<VisualEquivalenceReport, 'semanticBBoxPass' | 'semanticBBoxViolations'> {
  const violations: VisualEquivalenceReport['semanticBBoxViolations'] = [];
  const afterById = new Map(Object.values(after.project.objects).map(o => [o.id, o]));
  for (const obj of semanticObjects(before)) {
    const next = afterById.get(obj.id);
    if (!next) {
      violations.push({ objectId: obj.id, centerShiftPx: Number.POSITIVE_INFINITY, sizeChangeRatio: 1 });
      continue;
    }
    const cx1 = obj.bbox.x + obj.bbox.w / 2;
    const cy1 = obj.bbox.y + obj.bbox.h / 2;
    const cx2 = next.bbox.x + next.bbox.w / 2;
    const cy2 = next.bbox.y + next.bbox.h / 2;
    const centerShiftPx = Math.hypot(cx1 - cx2, cy1 - cy2);
    const sizeChangeRatio = Math.max(
      Math.abs((next.bbox.w || 1) - (obj.bbox.w || 1)) / Math.max(obj.bbox.w || 1, 1),
      Math.abs((next.bbox.h || 1) - (obj.bbox.h || 1)) / Math.max(obj.bbox.h || 1, 1),
    );
    if (centerShiftPx > 8 || sizeChangeRatio > 0.03) {
      violations.push({ objectId: obj.id, centerShiftPx, sizeChangeRatio });
    }
  }
  return { semanticBBoxPass: violations.length === 0, semanticBBoxViolations: violations };
}
