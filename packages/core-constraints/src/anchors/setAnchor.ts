
import { FigureEditorError, Project } from '../../../ir-schema/dist/index';
import { AnchorSpec, ConstraintMutationResult } from '../types';
import { cloneProject, getObject, pushConstraint } from '../helpers';

export function setAnchor(project: Project, objectId: string, anchor: AnchorSpec, offset: [number, number]): ConstraintMutationResult {
  const next = cloneProject(project);
  const obj = getObject(next, objectId) as any;
  if (!('anchor' in obj) || !('offset' in obj)) {
    throw new FigureEditorError('ERR_CAPABILITY_CONFLICT', `Object ${objectId} does not expose anchor/offset.`);
  }
  obj.anchor = {
    kind: anchor.kind,
    value: anchor.value,
    targetPanelId: anchor.targetPanelId ?? null,
  };
  obj.offset = offset;
  const type = anchor.kind === 'panel_anchor' ? 'anchor_to_panel' : 'anchor_to_figure';
  pushConstraint(next, type, [objectId], anchor.targetPanelId ?? null, { anchor, offset });
  return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
