
import { Project } from '../../../ir-schema/dist/index';
import { AnchorSpec } from '../types';
import { getFigureBounds, getObject, getPanelBounds } from '../helpers';

function anchorPoint(bounds: { x: number; y: number; w: number; h: number }, value: AnchorSpec['value']) {
  switch (value) {
    case 'top_left': return { x: bounds.x, y: bounds.y };
    case 'top_right': return { x: bounds.x + bounds.w, y: bounds.y };
    case 'bottom_left': return { x: bounds.x, y: bounds.y + bounds.h };
    case 'bottom_right': return { x: bounds.x + bounds.w, y: bounds.y + bounds.h };
    case 'top_center': return { x: bounds.x + bounds.w / 2, y: bounds.y };
    case 'center': return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
    default: return { x: bounds.x, y: bounds.y };
  }
}

export function resolveAnchor(project: Project, objectId: string): { x: number; y: number } {
  const obj = getObject(project, objectId) as any;
  if (!('anchor' in obj) || !('offset' in obj)) {
    return { x: obj.bbox.x, y: obj.bbox.y };
  }
  if (obj.anchor.kind === 'free' || obj.anchor.kind === 'absolute') {
    return { x: obj.bbox.x, y: obj.bbox.y };
  }
  const targetBounds = obj.anchor.kind === 'panel_anchor' && obj.anchor.targetPanelId
    ? getPanelBounds(project, obj.anchor.targetPanelId)
    : getFigureBounds(project);
  const pt = anchorPoint(targetBounds, obj.anchor.value ?? 'top_left');
  return { x: pt.x + (obj.offset?.[0] ?? 0), y: pt.y + (obj.offset?.[1] ?? 0) };
}
