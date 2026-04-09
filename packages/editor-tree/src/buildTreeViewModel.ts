
import { AnyObject, Project } from '../../ir-schema/dist/index';

export interface TreeNodeViewModel {
  id: string;
  label: string;
  objectType: string;
  visible: boolean;
  locked: boolean;
  capabilities: string[];
  children: TreeNodeViewModel[];
}

function toNode(obj: AnyObject, project: Project, visited: Set<string>): TreeNodeViewModel {
  if (visited.has(obj.id)) {
    return {
      id: obj.id,
      label: obj.name,
      objectType: obj.objectType,
      visible: obj.visible,
      locked: obj.locked,
      capabilities: [...obj.capabilities],
      children: [],
    };
  }
  visited.add(obj.id);
  const childIds = 'childObjectIds' in obj && Array.isArray((obj as any).childObjectIds) ? (obj as any).childObjectIds as string[] : [];
  return {
    id: obj.id,
    label: obj.name,
    objectType: obj.objectType,
    visible: obj.visible,
    locked: obj.locked,
    capabilities: [...obj.capabilities],
    children: childIds
      .map(id => project.project.objects[id])
      .filter(Boolean)
      .map(child => toNode(child, project, visited)),
  };
}

export function buildTreeViewModel(project: Project): TreeNodeViewModel[] {
  const roots = [
    ...project.project.figure.panels,
    ...project.project.figure.legends,
    ...project.project.figure.floatingObjects,
  ];
  const seen = new Set<string>();
  const nodes: TreeNodeViewModel[] = [];
  for (const id of roots) {
    if (seen.has(id)) continue;
    const obj = project.project.objects[id];
    if (!obj) continue;
    seen.add(id);
    nodes.push(toNode(obj, project, new Set<string>()));
  }
  return nodes;
}
