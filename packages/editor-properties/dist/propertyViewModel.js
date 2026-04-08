"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPropertyViewModel = buildPropertyViewModel;
function resolveTextStyleTarget(project, obj) {
    if (obj.objectType === 'text_node')
        return obj;
    const linkedTextId = 'textObjectId' in obj && typeof obj.textObjectId === 'string'
        ? String(obj.textObjectId)
        : '';
    if (!linkedTextId)
        return null;
    const linked = project.project.objects[linkedTextId];
    return linked?.objectType === 'text_node' ? linked : null;
}
function childRefsOf(obj) {
    const refs = new Set();
    if ('childObjectIds' in obj && Array.isArray(obj.childObjectIds)) {
        for (const childId of obj.childObjectIds)
            refs.add(String(childId));
    }
    if ('textObjectId' in obj && typeof obj.textObjectId === 'string' && obj.textObjectId.length > 0) {
        refs.add(String(obj.textObjectId));
    }
    if (obj.objectType === 'panel') {
        if (obj.contentRootId)
            refs.add(String(obj.contentRootId));
        if (obj.titleObjectId)
            refs.add(String(obj.titleObjectId));
    }
    if (obj.objectType === 'legend') {
        for (const childId of obj.itemObjectIds)
            refs.add(String(childId));
    }
    return [...refs];
}
function collectAppearanceTargets(project, obj, visited = new Set()) {
    if (visited.has(obj.id)) {
        return { fillTargets: [], strokeTargets: [] };
    }
    visited.add(obj.id);
    const fillTargets = [];
    const strokeTargets = [];
    if (obj.objectType === 'text_node') {
        fillTargets.push({ id: obj.id, color: obj.fill });
    }
    else if (obj.objectType === 'shape_node') {
        if (obj.shapeKind !== 'line' && obj.shapeKind !== 'polyline') {
            fillTargets.push({ id: obj.id, color: obj.fill.color ?? 'none' });
        }
        strokeTargets.push({ id: obj.id, color: obj.stroke.color ?? 'none' });
    }
    for (const childId of childRefsOf(obj)) {
        const child = project.project.objects[childId];
        if (!child)
            continue;
        const nested = collectAppearanceTargets(project, child, visited);
        fillTargets.push(...nested.fillTargets);
        strokeTargets.push(...nested.strokeTargets);
    }
    return { fillTargets, strokeTargets };
}
function buildPropertyViewModel(project, objectId) {
    const obj = project.project.objects[objectId];
    if (!obj)
        return null;
    const extra = {};
    if ('anchor' in obj)
        extra.anchor = obj.anchor;
    if ('offset' in obj)
        extra.offset = obj.offset;
    if (obj.objectType === 'text_node')
        extra.content = obj.content;
    if ('textObjectId' in obj)
        extra.textObjectId = obj.textObjectId;
    if (obj.objectType === 'legend')
        extra.itemObjectIds = [...obj.itemObjectIds];
    if ('childObjectIds' in obj && Array.isArray(obj.childObjectIds))
        extra.childObjectIds = [...obj.childObjectIds];
    const textStyleTarget = resolveTextStyleTarget(project, obj);
    const appearanceTargets = collectAppearanceTargets(project, obj);
    if (textStyleTarget?.objectType === 'text_node' && !('content' in extra)) {
        extra.content = textStyleTarget.content;
    }
    return {
        id: obj.id,
        objectType: obj.objectType,
        name: obj.name,
        bbox: obj.bbox,
        transform: obj.transform,
        capabilities: [...obj.capabilities],
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
        appearance: appearanceTargets.fillTargets.length > 0 || appearanceTargets.strokeTargets.length > 0
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
