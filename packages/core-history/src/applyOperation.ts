
import {
  AnyObject,
  CapabilityFlag,
  Legend,
  Panel,
  Project,
  TextNode,
  FigureEditorError,
} from '../../ir-schema/dist/index';
import { appendManualEdit } from './manualEdits';
import { appendOperationLog, pushSnapshot } from './undoRedo';
import { Operation } from './operationTypes';

function cloneProject(project: Project): Project {
  return structuredClone(project);
}

function getObject(project: Project, objectId: string): AnyObject {
  const obj = project.project.objects[objectId];
  if (!obj) throw new FigureEditorError('ERR_OBJECT_NOT_FOUND', `Object not found: ${objectId}`);
  return obj;
}

function moveBBox(obj: AnyObject, dx: number, dy: number): void {
  obj.bbox = { ...obj.bbox, x: obj.bbox.x + dx, y: obj.bbox.y + dy };
  obj.transform = {
    ...obj.transform,
    translate: [obj.transform.translate[0] + dx, obj.transform.translate[1] + dy],
  };
  if (obj.objectType === 'text_node') {
    obj.position = [obj.position[0] + dx, obj.position[1] + dy];
  }
}

function uniqueCapabilities(capabilities: CapabilityFlag[]): CapabilityFlag[] {
  return Array.from(new Set(capabilities));
}

function approximateTextBBox(obj: TextNode, content: string): TextNode['bbox'] {
  const fontSize = Math.max(10, Number(obj.font?.size ?? 12));
  const approxWidth = Math.max(fontSize * 0.8, fontSize * 0.58 * Math.max(1, content.length));
  return {
    x: Number(obj.position?.[0] ?? obj.bbox?.x ?? 0),
    y: Number((obj.position?.[1] ?? obj.bbox?.y ?? 0) - fontSize * 0.95),
    w: approxWidth,
    h: fontSize * 1.35,
  };
}

function upgradeProxyTextForEditing(obj: TextNode, content: string): void {
  const before = {
    textKind: obj.textKind,
    content: obj.content,
    capabilities: [...obj.capabilities],
    bbox: { ...obj.bbox },
  };
  obj.textKind = 'raw_text';
  obj.content = content;
  obj.capabilities = uniqueCapabilities([
    ...obj.capabilities.filter(capability => capability !== 'group_only'),
    'text_edit',
  ]);
  obj.bbox = approximateTextBBox(obj, content);
  if (!obj.font.family || obj.font.family === 'glyph_proxy') {
    obj.font.family = 'DejaVu Sans, Arial, sans-serif';
  }
  delete (obj as TextNode & { glyphVector?: unknown }).glyphVector;
  appendManualEdit(obj, 'manual_role_override', before, {
    textKind: obj.textKind,
    content: obj.content,
    capabilities: [...obj.capabilities],
    bbox: { ...obj.bbox },
  }, 'edit_text_proxy');
}

function childRefsOf(obj: AnyObject): string[] {
  const refs = new Set<string>();
  if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) {
    for (const childId of (obj as any).childObjectIds) refs.add(childId);
  }
  if (obj.objectType === 'panel') {
    if (obj.contentRootId) refs.add(obj.contentRootId);
    if (obj.titleObjectId) refs.add(obj.titleObjectId);
  }
  if (obj.objectType === 'legend') {
    for (const itemObjectId of obj.itemObjectIds) refs.add(itemObjectId);
  }
  return [...refs];
}

function uniqueExistingObjectIds(project: Project, objectIds: string[]): string[] {
  const objects = project.project.objects;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawId of objectIds) {
    const objectId = String(rawId ?? '').trim();
    if (!objectId || seen.has(objectId) || !objects[objectId]) continue;
    seen.add(objectId);
    out.push(objectId);
  }
  return out;
}

function buildParentMap(project: Project): Map<string, Set<string>> {
  const parentMap = new Map<string, Set<string>>();
  for (const obj of Object.values(project.project.objects) as AnyObject[]) {
    for (const childId of childRefsOf(obj)) {
      if (!project.project.objects[childId]) continue;
      let parents = parentMap.get(childId);
      if (!parents) {
        parents = new Set<string>();
        parentMap.set(childId, parents);
      }
      parents.add(obj.id);
    }
  }
  return parentMap;
}

function hasSelectedAncestor(
  objectId: string,
  selectedIds: Set<string>,
  parentMap: Map<string, Set<string>>,
  seen = new Set<string>()
): boolean {
  const parents = parentMap.get(objectId);
  if (!parents) return false;
  for (const parentId of parents) {
    if (selectedIds.has(parentId)) return true;
    if (seen.has(parentId)) continue;
    seen.add(parentId);
    if (hasSelectedAncestor(parentId, selectedIds, parentMap, seen)) return true;
  }
  return false;
}

function filterTopLevelSelection(project: Project, objectIds: string[]): string[] {
  const uniqueExisting = uniqueExistingObjectIds(project, objectIds);
  if (uniqueExisting.length < 2) return uniqueExisting;
  const selectedIds = new Set(uniqueExisting);
  const parentMap = buildParentMap(project);
  return uniqueExisting.filter((objectId) => !hasSelectedAncestor(objectId, selectedIds, parentMap));
}

function removeIdsFromArray(arr: string[], removedIds: Set<string>): string[] {
  return arr.filter((value) => !removedIds.has(value));
}

function updateChildRefsForRemovedIds(project: Project, removedIds: Set<string>): void {
  for (const obj of Object.values(project.project.objects) as AnyObject[]) {
    if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) {
      (obj as any).childObjectIds = removeIdsFromArray((obj as any).childObjectIds, removedIds);
    }
    if (obj.objectType === 'legend') {
      obj.itemObjectIds = removeIdsFromArray(obj.itemObjectIds, removedIds);
    }
  }
}

function moveObjectTree(project: Project, objectId: string, dx: number, dy: number, visited = new Set<string>()): void {
  if (visited.has(objectId)) return;
  visited.add(objectId);
  const obj = getObject(project, objectId);
  moveBBox(obj, dx, dy);
  for (const childId of childRefsOf(obj)) {
    if (!project.project.objects[childId]) continue;
    moveObjectTree(project, childId, dx, dy, visited);
  }
}

function removeId(arr: string[], id: string): string[] {
  return arr.filter(v => v !== id);
}

function updateChildRefs(project: Project, removedId: string): void {
  for (const obj of Object.values(project.project.objects) as AnyObject[]) {
    if ('childObjectIds' in obj && Array.isArray((obj as any).childObjectIds)) {
      (obj as any).childObjectIds = (obj as any).childObjectIds.filter((id: string) => id !== removedId);
    }
    if (obj.objectType === 'legend') {
      obj.itemObjectIds = obj.itemObjectIds.filter(id => id !== removedId);
    }
  }
}

function buildSemanticFromSelection(project: Project, objectIds: string[], role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason: string): string {
  if (objectIds.length === 0) {
    throw new FigureEditorError('ERR_INVALID_MANUAL_PROMOTION', 'Cannot promote empty selection.');
  }
  const objs = objectIds.map(id => getObject(project, id));
  const xs = objs.map(o => o.bbox.x);
  const ys = objs.map(o => o.bbox.y);
  const x2 = objs.map(o => o.bbox.x + o.bbox.w);
  const y2 = objs.map(o => o.bbox.y + o.bbox.h);
  const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...x2) - Math.min(...xs), h: Math.max(...y2) - Math.min(...ys) };
  const base = objs[0];
  const id = `obj_manual_${role}_${project.project.history.operationLog.length + 1}`;
  const provenance = {
    ...base.provenance,
    originNodeIds: Array.from(new Set(objs.flatMap(o => o.provenance.originNodeIds))),
    liftedBy: 'manual_promote',
    liftConfidence: 'manual',
  } as AnyObject['provenance'];

  let created: AnyObject;
  if (role === 'legend') {
    created = {
      ...base,
      id,
      objectType: 'legend',
      name: `legend_${id}`,
      bbox,
      capabilities: ['select', 'multi_select', 'drag', 'delete', 'reparent'],
      provenance,
      itemObjectIds: [...objectIds],
      anchor: { kind: 'free', value: null, targetPanelId: null },
      offset: [0, 0],
      orientation: 'auto',
      floating: true,
    } as Legend;
    project.project.figure.legends.push(id);
  } else if (role === 'panel') {
    created = {
      ...base,
      id,
      objectType: 'panel',
      name: `panel_${id}`,
      bbox,
      capabilities: ['select', 'multi_select', 'drag', 'resize', 'delete', 'reparent'],
      provenance,
      label: null,
      titleObjectId: null,
      layoutRole: 'composite_panel',
      anchor: { kind: 'absolute', value: null },
      offset: [0, 0],
      contentRootId: objectIds[0],
      childObjectIds: [...objectIds],
      axisHints: { hasXAxis: false, hasYAxis: false, hasColorbar: false, axisGroupIds: [] },
    } as Panel;
    project.project.figure.panels.push(id);
  } else if (role === 'annotation_block') {
    created = {
      ...base,
      id,
      objectType: 'annotation_block',
      name: `annotation_${id}`,
      bbox,
      capabilities: ['select', 'multi_select', 'drag', 'delete', 'reparent'],
      provenance,
      purpose: 'generic_note',
      childObjectIds: [...objectIds],
      anchor: { kind: 'free', value: null, targetPanelId: null },
      offset: [0, 0],
    } as AnyObject;
    project.project.figure.floatingObjects.push(id);
  } else {
    created = {
      ...base,
      id,
      objectType: 'group_node',
      name: `group_${id}`,
      bbox,
      capabilities: ['select', 'multi_select', 'drag', 'delete', 'group_only', 'promote_semantic_role', 'reparent'],
      provenance,
      childObjectIds: [...objectIds],
      semanticRoleHint: 'generic_group',
    } as AnyObject;
    project.project.figure.floatingObjects.push(id);
  }

  appendManualEdit(created, 'manual_promote', { objectIds, role: 'none' }, { objectIds, role }, reason);
  project.project.objects[id] = created;
  return id;
}

export function applyOperation(project: Project, operation: Operation): Project {
  const next = pushSnapshot(project);

  switch (operation.type) {
    case 'MOVE_OBJECT': {
      moveObjectTree(next, operation.payload.objectId, operation.payload.delta.x, operation.payload.delta.y);
      break;
    }
    case 'MOVE_OBJECTS': {
      const objectIds = filterTopLevelSelection(next, operation.payload.objectIds);
      for (const objectId of objectIds) {
        moveObjectTree(next, objectId, operation.payload.delta.x, operation.payload.delta.y);
      }
      break;
    }
    case 'RESIZE_OBJECT': {
      const obj = getObject(next, operation.payload.objectId);
      obj.bbox = { ...operation.payload.bbox };
      break;
    }
    case 'DELETE_OBJECT': {
      getObject(next, operation.payload.objectId);
      delete next.project.objects[operation.payload.objectId];
      const removedIds = new Set<string>([operation.payload.objectId]);
      next.project.figure.panels = removeIdsFromArray(next.project.figure.panels, removedIds);
      next.project.figure.legends = removeIdsFromArray(next.project.figure.legends, removedIds);
      next.project.figure.floatingObjects = removeIdsFromArray(next.project.figure.floatingObjects, removedIds);
      updateChildRefsForRemovedIds(next, removedIds);
      break;
    }
    case 'DELETE_OBJECTS': {
      const objectIds = uniqueExistingObjectIds(next, operation.payload.objectIds);
      const removedIds = new Set<string>(objectIds);
      for (const objectId of objectIds) {
        delete next.project.objects[objectId];
      }
      next.project.figure.panels = removeIdsFromArray(next.project.figure.panels, removedIds);
      next.project.figure.legends = removeIdsFromArray(next.project.figure.legends, removedIds);
      next.project.figure.floatingObjects = removeIdsFromArray(next.project.figure.floatingObjects, removedIds);
      updateChildRefsForRemovedIds(next, removedIds);
      break;
    }
    case 'EDIT_TEXT_CONTENT': {
      const obj = getObject(next, operation.payload.objectId);
      if (obj.objectType === 'text_node' && (obj.textKind === 'path_text_proxy' || obj.textKind === 'raster_text_proxy')) {
        upgradeProxyTextForEditing(obj, operation.payload.content);
        break;
      }
      if (!obj.capabilities.includes('text_edit')) {
        throw new FigureEditorError('ERR_TEXT_EDIT_UNSUPPORTED', `Object ${operation.payload.objectId} does not support text editing.`);
      }
      if (obj.objectType === 'text_node') {
        const before = { content: obj.content };
        obj.content = operation.payload.content;
        obj.bbox = approximateTextBBox(obj, obj.content);
        appendManualEdit(obj, 'manual_role_override', before, { content: obj.content }, 'edit_text');
      } else if (obj.objectType === 'html_block') {
        const before = { textContent: obj.textContent };
        obj.textContent = operation.payload.content;
        appendManualEdit(obj, 'manual_role_override', before, { textContent: obj.textContent }, 'edit_text');
      } else {
        throw new FigureEditorError('ERR_TEXT_EDIT_UNSUPPORTED', `Object ${operation.payload.objectId} does not support text editing.`);
      }
      break;
    }
    case 'SET_ANCHOR': {
      const obj = getObject(next, operation.payload.objectId) as any;
      if (!('anchor' in obj)) {
        throw new FigureEditorError('ERR_CAPABILITY_CONFLICT', `Object ${operation.payload.objectId} does not expose anchor.`);
      }
      const before = { anchor: obj.anchor, offset: obj.offset };
      obj.anchor = operation.payload.anchor;
      obj.offset = operation.payload.offset;
      appendManualEdit(obj, 'manual_anchor_change', before, { anchor: obj.anchor, offset: obj.offset }, 'set_anchor');
      break;
    }
    case 'PROMOTE_SELECTION': {
      buildSemanticFromSelection(next, operation.payload.objectIds, operation.payload.role, operation.payload.reason);
      break;
    }
    case 'OVERRIDE_ROLE': {
      const obj = getObject(next, operation.payload.objectId);
      const createdId = buildSemanticFromSelection(next, [obj.id], operation.payload.role, operation.payload.reason);
      delete next.project.objects[obj.id];
      next.project.figure.panels = removeId(next.project.figure.panels, obj.id);
      next.project.figure.legends = removeId(next.project.figure.legends, obj.id);
      next.project.figure.floatingObjects = removeId(next.project.figure.floatingObjects, obj.id);
      updateChildRefs(next, obj.id);
      if (!next.project.figure.floatingObjects.includes(createdId) && !next.project.figure.panels.includes(createdId) && !next.project.figure.legends.includes(createdId)) {
        next.project.figure.floatingObjects.push(createdId);
      }
      break;
    }
    case 'GROUP_OBJECTS': {
      buildSemanticFromSelection(next, operation.payload.objectIds, 'group_node', 'group_objects');
      break;
    }
    case 'UNGROUP_OBJECT': {
      const obj = getObject(next, operation.payload.groupId);
      if (obj.objectType !== 'group_node') {
        throw new FigureEditorError('ERR_INVALID_MANUAL_PROMOTION', `Object ${obj.id} is not a group_node.`);
      }
      delete next.project.objects[obj.id];
      next.project.figure.floatingObjects = removeId(next.project.figure.floatingObjects, obj.id);
      break;
    }
    default:
      ((_: never) => _)(operation);
  }

  appendOperationLog(next, operation);
  next.project.updatedAt = new Date().toISOString();
  return next;
}
