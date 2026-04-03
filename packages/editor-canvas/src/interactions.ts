
import { applyOperation } from '../../core-history/dist/index';
import { Project } from '../../ir-schema/dist/index';

export function dragObject(project: Project, objectId: string, dx: number, dy: number): Project {
  return applyOperation(project, { type: 'MOVE_OBJECT', payload: { objectId, delta: { x: dx, y: dy } } });
}

export function resizeObject(project: Project, objectId: string, bbox: { x: number; y: number; w: number; h: number }): Project {
  return applyOperation(project, { type: 'RESIZE_OBJECT', payload: { objectId, bbox } });
}

export function editTextObject(project: Project, objectId: string, content: string): Project {
  return applyOperation(project, { type: 'EDIT_TEXT_CONTENT', payload: { objectId, content } });
}
