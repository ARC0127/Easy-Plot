
import { Project } from '../../ir-schema/dist/index';

export function setObjectVisibility(project: Project, objectId: string, visible: boolean): Project {
  const next = structuredClone(project);
  const obj = next.project.objects[objectId];
  if (obj) obj.visible = visible;
  return next;
}

export function setObjectLocked(project: Project, objectId: string, locked: boolean): Project {
  const next = structuredClone(project);
  const obj = next.project.objects[objectId];
  if (obj) obj.locked = locked;
  return next;
}
