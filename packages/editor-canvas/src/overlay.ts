
import { Project } from '../../ir-schema/dist/index';
import { OverlayBox } from './types';

export function buildSelectionOverlay(project: Project, selectedIds: string[]): OverlayBox[] {
  return selectedIds
    .map(id => project.project.objects[id])
    .filter(Boolean)
    .map(obj => ({ objectId: obj.id, x: obj.bbox.x, y: obj.bbox.y, w: obj.bbox.w, h: obj.bbox.h }));
}
