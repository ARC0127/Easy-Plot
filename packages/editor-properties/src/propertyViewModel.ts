
import { AnyObject, Project } from '../../ir-schema/dist/index';

export interface TextStyleViewModel {
  targetObjectId: string;
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  fill: string;
}

export interface AppearanceViewModel {
  targetObjectIds: string[];
  fillTargetCount: number;
  strokeTargetCount: number;
  fillColor: string | null;
  strokeColor: string | null;
}

export interface PropertyViewModel {
  id: string;
  objectType: string;
  name: string;
  bbox: AnyObject['bbox'];
  transform: AnyObject['transform'];
  capabilities: string[];
  provenance: AnyObject['provenance'];
  stability: AnyObject['stability'];
  textStyle: TextStyleViewModel | null;
  appearance: AppearanceViewModel | null;
  extra: Record<string, unknown>;
}

function normalizeSelectedObjectIds(project: Project, objectIds: string | string[]): string[] {
  const inputIds = Array.isArray(objectIds) ? objectIds : [objectIds];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawId of inputIds) {
    const objectId = String(rawId ?? '').trim();
    if (!objectId || seen.has(objectId) || !project.project.objects[objectId]) continue;
    seen.add(objectId);
    out.push(objectId);
  }
  return out;
}

function childRefsOf(obj: AnyObject): string[] {
  const refs = new Set<string>();
  if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) {
    for (const childId of (obj as any).childObjectIds) refs.add(String(childId));
  }
  if ('textObjectId' in obj && typeof (obj as any).textObjectId === 'string' && (obj as any).textObjectId.length > 0) {
    refs.add(String((obj as any).textObjectId));
  }
  if (obj.objectType === 'panel') {
    if (obj.contentRootId) refs.add(String(obj.contentRootId));
    if (obj.titleObjectId) refs.add(String(obj.titleObjectId));
  }
  if (obj.objectType === 'legend') {
    for (const childId of obj.itemObjectIds) refs.add(String(childId));
  }
  return [...refs];
}

function collectDescendantObjectIds(project: Project, rootId: string, visited = new Set<string>()): string[] {
  if (visited.has(rootId)) return [];
  visited.add(rootId);
  const out = [rootId];
  const obj = project.project.objects[rootId];
  if (!obj) return out;
  for (const childId of childRefsOf(obj)) {
    out.push(...collectDescendantObjectIds(project, childId, visited));
  }
  return out;
}

function collectTopLevelSelectedIds(project: Project, objectIds: string[]): string[] {
  const normalized = normalizeSelectedObjectIds(project, objectIds);
  if (normalized.length < 2) return normalized;
  const selectedSet = new Set(normalized);
  return normalized.filter((candidateId) => {
    for (const otherId of selectedSet) {
      if (otherId === candidateId) continue;
      const descendants = collectDescendantObjectIds(project, otherId);
      if (descendants.includes(candidateId)) return false;
    }
    return true;
  });
}

function resolveTextStyleTarget(project: Project, objectIds: string | string[]): AnyObject | null {
  const textTargets = collectTextTargets(project, objectIds);
  return textTargets[0] ?? null;
}

function collectAppearanceTargets(project: Project, obj: AnyObject, visited = new Set<string>()): {
  fillTargets: Array<{ id: string; color: string }>;
  strokeTargets: Array<{ id: string; color: string }>;
} {
  if (visited.has(obj.id)) {
    return { fillTargets: [], strokeTargets: [] };
  }
  visited.add(obj.id);

  const fillTargets: Array<{ id: string; color: string }> = [];
  const strokeTargets: Array<{ id: string; color: string }> = [];

  if (obj.objectType === 'text_node') {
    fillTargets.push({ id: obj.id, color: obj.fill });
  } else if (obj.objectType === 'shape_node') {
    if (obj.shapeKind !== 'line' && obj.shapeKind !== 'polyline') {
      fillTargets.push({ id: obj.id, color: obj.fill.color ?? 'none' });
    }
    strokeTargets.push({ id: obj.id, color: obj.stroke.color ?? 'none' });
  }

  for (const childId of childRefsOf(obj)) {
    const child = project.project.objects[childId];
    if (!child) continue;
    const nested = collectAppearanceTargets(project, child, visited);
    fillTargets.push(...nested.fillTargets);
    strokeTargets.push(...nested.strokeTargets);
  }

  return { fillTargets, strokeTargets };
}

function collectTextTargets(project: Project, objectIds: string | string[]): AnyObject[] {
  const normalized = collectTopLevelSelectedIds(project, Array.isArray(objectIds) ? objectIds : [objectIds]);
  const textTargets: AnyObject[] = [];
  const seen = new Set<string>();
  for (const objectId of normalized) {
    const root = project.project.objects[objectId];
    if (!root) continue;
    for (const descendantId of collectDescendantObjectIds(project, root.id)) {
      if (seen.has(descendantId)) continue;
      const candidate = project.project.objects[descendantId];
      if (!candidate || candidate.objectType !== 'text_node') continue;
      seen.add(descendantId);
      textTargets.push(candidate);
    }
  }
  return textTargets;
}

function collectSelectedAppearanceTargets(project: Project, objectIds: string | string[]) {
  const normalized = collectTopLevelSelectedIds(project, Array.isArray(objectIds) ? objectIds : [objectIds]);
  const fillTargets: Array<{ id: string; color: string }> = [];
  const strokeTargets: Array<{ id: string; color: string }> = [];
  const visited = new Set<string>();
  for (const objectId of normalized) {
    const root = project.project.objects[objectId];
    if (!root) continue;
    const nested = collectAppearanceTargets(project, root, visited);
    fillTargets.push(...nested.fillTargets);
    strokeTargets.push(...nested.strokeTargets);
  }
  return { fillTargets, strokeTargets };
}

export function buildPropertyViewModel(project: Project, objectIds: string | string[]): PropertyViewModel | null {
  const selectedIds = normalizeSelectedObjectIds(project, objectIds);
  if (selectedIds.length === 0) return null;
  const primaryId = selectedIds[0];
  const obj = project.project.objects[primaryId];
  if (!obj) return null;
  const extra: Record<string, unknown> = {};
  extra.selectedCount = selectedIds.length;
  extra.selectedObjectIds = [...selectedIds];
  extra.isMultiSelection = selectedIds.length > 1;
  if ('anchor' in obj) extra.anchor = (obj as any).anchor;
  if ('offset' in obj) extra.offset = (obj as any).offset;
  if (obj.objectType === 'text_node') extra.content = obj.content;
  if ('textObjectId' in obj) extra.textObjectId = (obj as any).textObjectId;
  if (obj.objectType === 'legend') extra.itemObjectIds = [...obj.itemObjectIds];
  if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) extra.childObjectIds = [...(obj as any).childObjectIds];
  const textTargets = collectTextTargets(project, selectedIds);
  const textStyleTarget = textTargets[0] ?? null;
  const appearanceTargets = collectSelectedAppearanceTargets(project, selectedIds);
  extra.textTargetCount = textTargets.length;
  extra.appearanceTargetCount = Array.from(new Set([
    ...appearanceTargets.fillTargets.map((entry) => entry.id),
    ...appearanceTargets.strokeTargets.map((entry) => entry.id),
  ])).length;
  if (textStyleTarget?.objectType === 'text_node' && !('content' in extra)) {
    extra.content = textStyleTarget.content;
  }
  return {
    id: obj.id,
    objectType: selectedIds.length > 1 ? 'multi_selection' : obj.objectType,
    name: selectedIds.length > 1 ? `多选对象 (${selectedIds.length})` : obj.name,
    bbox: obj.bbox,
    transform: obj.transform,
    capabilities: selectedIds.length > 1
      ? Array.from(new Set(selectedIds.flatMap((selectedId) => project.project.objects[selectedId]?.capabilities ?? [])))
      : [...obj.capabilities],
    provenance: obj.provenance,
    stability: obj.stability,
    textStyle: textStyleTarget?.objectType === 'text_node'
      ? {
          targetObjectId: textStyleTarget.id,
          content: textStyleTarget.content,
          fontFamily: textStyleTarget.font.family,
          fontSize: textStyleTarget.font.size,
          fontWeight: textStyleTarget.font.weight,
          fontStyle: textStyleTarget.font.style,
          fill: textStyleTarget.fill,
        }
      : null,
    appearance:
      appearanceTargets.fillTargets.length > 0 || appearanceTargets.strokeTargets.length > 0
        ? {
            targetObjectIds: Array.from(new Set([
              ...appearanceTargets.fillTargets.map((entry) => entry.id),
              ...appearanceTargets.strokeTargets.map((entry) => entry.id),
            ])),
            fillTargetCount: appearanceTargets.fillTargets.length,
            strokeTargetCount: appearanceTargets.strokeTargets.length,
            fillColor: appearanceTargets.fillTargets[0]?.color ?? null,
            strokeColor: appearanceTargets.strokeTargets[0]?.color ?? null,
          }
        : null,
    extra,
  };
}
