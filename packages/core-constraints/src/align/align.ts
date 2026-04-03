
import { AnyObject, Project } from '../../../ir-schema/dist/index';
import { AlignmentMode, ConstraintMutationResult } from '../types';
import { cloneProject, getObject, pushConstraint } from '../helpers';

function setX(obj: AnyObject, x: number) {
  obj.transform = { ...obj.transform, translate: [obj.transform.translate[0] + (x - obj.bbox.x), obj.transform.translate[1]] };
  obj.bbox = { ...obj.bbox, x };
}

function setY(obj: AnyObject, y: number) {
  obj.transform = { ...obj.transform, translate: [obj.transform.translate[0], obj.transform.translate[1] + (y - obj.bbox.y)] };
  obj.bbox = { ...obj.bbox, y };
}

export function align(project: Project, objectIds: string[], mode: AlignmentMode): ConstraintMutationResult {
  const next = cloneProject(project);
  const objs = objectIds.map(id => getObject(next, id));
  if (objs.length < 2) return { project: next, appliedConstraint: null };

  if (mode === 'align_left') {
    const x = Math.min(...objs.map(o => o.bbox.x));
    objs.forEach(o => setX(o, x));
  } else if (mode === 'align_right') {
    const right = Math.max(...objs.map(o => o.bbox.x + o.bbox.w));
    objs.forEach(o => setX(o, right - o.bbox.w));
  } else if (mode === 'align_top') {
    const y = Math.min(...objs.map(o => o.bbox.y));
    objs.forEach(o => setY(o, y));
  } else if (mode === 'align_bottom') {
    const bottom = Math.max(...objs.map(o => o.bbox.y + o.bbox.h));
    objs.forEach(o => setY(o, bottom - o.bbox.h));
  } else if (mode === 'center_horizontal') {
    const cx = objs.reduce((s, o) => s + o.bbox.x + o.bbox.w / 2, 0) / objs.length;
    objs.forEach(o => setX(o, cx - o.bbox.w / 2));
  } else if (mode === 'center_vertical') {
    const cy = objs.reduce((s, o) => s + o.bbox.y + o.bbox.h / 2, 0) / objs.length;
    objs.forEach(o => setY(o, cy - o.bbox.h / 2));
  }

  pushConstraint(next, mode, objectIds, null, {});
  return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
