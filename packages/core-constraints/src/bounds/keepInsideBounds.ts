
import { Project } from '../../../ir-schema/dist/index';
import { ConstraintMutationResult } from '../types';
import { cloneProject, getFigureBounds, getObject, getPanelBounds, pushConstraint } from '../helpers';

export function keepInsideBounds(project: Project, objectId: string, targetPanelId?: string | null): ConstraintMutationResult {
  const next = cloneProject(project);
  const obj = getObject(next, objectId);
  const bounds = targetPanelId ? getPanelBounds(next, targetPanelId) : getFigureBounds(next);
  let x = obj.bbox.x;
  let y = obj.bbox.y;
  x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w - obj.bbox.w));
  y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h - obj.bbox.h));
  obj.transform = {
    ...obj.transform,
    translate: [obj.transform.translate[0] + (x - obj.bbox.x), obj.transform.translate[1] + (y - obj.bbox.y)],
  };
  obj.bbox = { ...obj.bbox, x, y };
  pushConstraint(next, 'keep_inside_bounds', [objectId], targetPanelId ?? null, {});
  return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
