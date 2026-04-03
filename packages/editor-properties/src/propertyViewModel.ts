
import { AnyObject, Project } from '../../ir-schema/dist/index';

export interface PropertyViewModel {
  id: string;
  objectType: string;
  name: string;
  bbox: AnyObject['bbox'];
  transform: AnyObject['transform'];
  capabilities: string[];
  provenance: AnyObject['provenance'];
  stability: AnyObject['stability'];
  extra: Record<string, unknown>;
}

export function buildPropertyViewModel(project: Project, objectId: string): PropertyViewModel | null {
  const obj = project.project.objects[objectId];
  if (!obj) return null;
  const extra: Record<string, unknown> = {};
  if ('anchor' in obj) extra.anchor = (obj as any).anchor;
  if ('offset' in obj) extra.offset = (obj as any).offset;
  if (obj.objectType === 'text_node') extra.content = obj.content;
  if (obj.objectType === 'legend') extra.itemObjectIds = [...obj.itemObjectIds];
  if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) extra.childObjectIds = [...(obj as any).childObjectIds];
  return {
    id: obj.id,
    objectType: obj.objectType,
    name: obj.name,
    bbox: obj.bbox,
    transform: obj.transform,
    capabilities: [...obj.capabilities],
    provenance: obj.provenance,
    stability: obj.stability,
    extra,
  };
}
