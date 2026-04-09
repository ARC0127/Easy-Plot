"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPropertyViewModel = buildPropertyViewModel;
function normalizeSelectedObjectIds(project, objectIds) {
    const inputIds = Array.isArray(objectIds) ? objectIds : [objectIds];
    const seen = new Set();
    const out = [];
    for (const rawId of inputIds) {
        const objectId = String(rawId ?? '').trim();
        if (!objectId || seen.has(objectId) || !project.project.objects[objectId])
            continue;
        seen.add(objectId);
        out.push(objectId);
    }
    return out;
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
function collectDescendantObjectIds(project, rootId, visited = new Set()) {
    if (visited.has(rootId))
        return [];
    visited.add(rootId);
    const out = [rootId];
    const obj = project.project.objects[rootId];
    if (!obj)
        return out;
    for (const childId of childRefsOf(obj)) {
        out.push(...collectDescendantObjectIds(project, childId, visited));
    }
    return out;
}
function collectTopLevelSelectedIds(project, objectIds) {
    const normalized = normalizeSelectedObjectIds(project, objectIds);
    if (normalized.length < 2)
        return normalized;
    const selectedSet = new Set(normalized);
    return normalized.filter((candidateId) => {
        for (const otherId of selectedSet) {
            if (otherId === candidateId)
                continue;
            const descendants = collectDescendantObjectIds(project, otherId);
            if (descendants.includes(candidateId))
                return false;
        }
        return true;
    });
}
function resolveTextStyleTarget(project, objectIds) {
    const textTargets = collectTextTargets(project, objectIds);
    return textTargets[0] ?? null;
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
function collectTextTargets(project, objectIds) {
    const normalized = collectTopLevelSelectedIds(project, Array.isArray(objectIds) ? objectIds : [objectIds]);
    const textTargets = [];
    const seen = new Set();
    for (const objectId of normalized) {
        const root = project.project.objects[objectId];
        if (!root)
            continue;
        for (const descendantId of collectDescendantObjectIds(project, root.id)) {
            if (seen.has(descendantId))
                continue;
            const candidate = project.project.objects[descendantId];
            if (!candidate || candidate.objectType !== 'text_node')
                continue;
            seen.add(descendantId);
            textTargets.push(candidate);
        }
    }
    return textTargets;
}
function collectSelectedAppearanceTargets(project, objectIds) {
    const normalized = collectTopLevelSelectedIds(project, Array.isArray(objectIds) ? objectIds : [objectIds]);
    const fillTargets = [];
    const strokeTargets = [];
    const visited = new Set();
    for (const objectId of normalized) {
        const root = project.project.objects[objectId];
        if (!root)
            continue;
        const nested = collectAppearanceTargets(project, root, visited);
        fillTargets.push(...nested.fillTargets);
        strokeTargets.push(...nested.strokeTargets);
    }
    return { fillTargets, strokeTargets };
}
function buildPropertyViewModel(project, objectIds) {
    const selectedIds = normalizeSelectedObjectIds(project, objectIds);
    if (selectedIds.length === 0)
        return null;
    const primaryId = selectedIds[0];
    const obj = project.project.objects[primaryId];
    if (!obj)
        return null;
    const extra = {};
    extra.selectedCount = selectedIds.length;
    extra.selectedObjectIds = [...selectedIds];
    extra.isMultiSelection = selectedIds.length > 1;
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
