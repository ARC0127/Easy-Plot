
import { Project } from '../../ir-schema/dist/index';
import { HitTarget } from './types';

function objectPriority(objectType: string): number {
  switch (objectType) {
    case 'text_node':
      return 5;
    case 'shape_node':
      return 4;
    case 'image_node':
      return 3;
    case 'html_block':
      return 2;
    case 'group_node':
      return 1;
    default:
      return 0;
  }
}

function area(obj: Project['project']['objects'][string]): number {
  return obj.bbox.w * obj.bbox.h;
}

export function hitTestAtPoint(project: Project, x: number, y: number): HitTarget | null {
  const objects = Object.values(project.project.objects);
  const sorted = objects.slice().sort((a, b) => {
    if (b.zIndex !== a.zIndex) return b.zIndex - a.zIndex;
    const priorityDiff = objectPriority(b.objectType) - objectPriority(a.objectType);
    if (priorityDiff !== 0) return priorityDiff;
    return area(a) - area(b);
  });
  for (const obj of sorted) {
    if (!obj.visible) continue;
    const b = obj.bbox;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return { objectId: obj.id, objectType: obj.objectType };
    }
  }
  return null;
}
