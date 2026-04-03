
import { AnyObject, FigureEditorError, Project } from '../../ir-schema/dist/index';

export function cloneProject(project: Project): Project {
  return structuredClone(project) as Project;
}

export function getObject(project: Project, objectId: string): AnyObject {
  const obj = project.project.objects[objectId];
  if (!obj) throw new FigureEditorError('ERR_OBJECT_NOT_FOUND', `Object not found: ${objectId}`);
  return obj;
}

export function getFigureBounds(project: Project): { x: number; y: number; w: number; h: number } {
  const vb = project.project.figure.viewBox;
  return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
}

export function getPanelBounds(project: Project, panelId: string): { x: number; y: number; w: number; h: number } {
  const obj = getObject(project, panelId);
  if (obj.objectType !== 'panel') {
    throw new FigureEditorError('ERR_CAPABILITY_CONFLICT', `Target ${panelId} is not a panel.`);
  }
  return obj.bbox;
}

export function pushConstraint(project: Project, constraintType: string, subjectIds: string[], targetId: string | null, params: Record<string, unknown>) {
  project.project.figure.constraints.push({
    id: `c_${project.project.figure.constraints.length + 1}`,
    constraintType: constraintType as any,
    subjectIds,
    targetId,
    params,
  });
}
