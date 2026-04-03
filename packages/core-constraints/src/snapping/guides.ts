
import { Project } from '../../../ir-schema/dist/index';
import { GuideLine } from '../types';

export function buildGuides(project: Project): GuideLine[] {
  const guides: GuideLine[] = [];
  for (const obj of Object.values(project.project.objects)) {
    guides.push({ id: `${obj.id}_left`, orientation: 'vertical', position: obj.bbox.x, sourceObjectId: obj.id });
    guides.push({ id: `${obj.id}_cx`, orientation: 'vertical', position: obj.bbox.x + obj.bbox.w / 2, sourceObjectId: obj.id });
    guides.push({ id: `${obj.id}_right`, orientation: 'vertical', position: obj.bbox.x + obj.bbox.w, sourceObjectId: obj.id });
    guides.push({ id: `${obj.id}_top`, orientation: 'horizontal', position: obj.bbox.y, sourceObjectId: obj.id });
    guides.push({ id: `${obj.id}_cy`, orientation: 'horizontal', position: obj.bbox.y + obj.bbox.h / 2, sourceObjectId: obj.id });
    guides.push({ id: `${obj.id}_bottom`, orientation: 'horizontal', position: obj.bbox.y + obj.bbox.h, sourceObjectId: obj.id });
  }
  return guides;
}
