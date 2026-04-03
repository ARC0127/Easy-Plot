
import { AnyObject, Project } from '../../../ir-schema/dist/index';
import { ConstraintMutationResult, DistributeMode } from '../types';
import { cloneProject, getObject, pushConstraint } from '../helpers';

function setX(obj: AnyObject, x: number) {
  obj.transform = { ...obj.transform, translate: [obj.transform.translate[0] + (x - obj.bbox.x), obj.transform.translate[1]] };
  obj.bbox = { ...obj.bbox, x };
}

function setY(obj: AnyObject, y: number) {
  obj.transform = { ...obj.transform, translate: [obj.transform.translate[0], obj.transform.translate[1] + (y - obj.bbox.y)] };
  obj.bbox = { ...obj.bbox, y };
}

export function distribute(project: Project, objectIds: string[], mode: DistributeMode): ConstraintMutationResult {
  const next = cloneProject(project);
  const objs = objectIds.map(id => getObject(next, id));
  if (objs.length < 3) return { project: next, appliedConstraint: null };

  if (mode === 'equal_spacing_horizontal') {
    const sorted = [...objs].sort((a, b) => a.bbox.x - b.bbox.x);
    const left = sorted[0].bbox.x;
    const right = sorted[sorted.length - 1].bbox.x + sorted[sorted.length - 1].bbox.w;
    const totalW = sorted.reduce((s, o) => s + o.bbox.w, 0);
    const gap = (right - left - totalW) / (sorted.length - 1 || 1);
    let cursor = left;
    for (const obj of sorted) {
      setX(obj, cursor);
      cursor += obj.bbox.w + gap;
    }
  } else {
    const sorted = [...objs].sort((a, b) => a.bbox.y - b.bbox.y);
    const top = sorted[0].bbox.y;
    const bottom = sorted[sorted.length - 1].bbox.y + sorted[sorted.length - 1].bbox.h;
    const totalH = sorted.reduce((s, o) => s + o.bbox.h, 0);
    const gap = (bottom - top - totalH) / (sorted.length - 1 || 1);
    let cursor = top;
    for (const obj of sorted) {
      setY(obj, cursor);
      cursor += obj.bbox.h + gap;
    }
  }

  pushConstraint(next, mode, objectIds, null, {});
  return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
