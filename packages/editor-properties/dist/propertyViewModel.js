"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPropertyViewModel = buildPropertyViewModel;
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
    if (obj.objectType === 'legend')
        extra.itemObjectIds = [...obj.itemObjectIds];
    if ('childObjectIds' in obj && Array.isArray(obj.childObjectIds))
        extra.childObjectIds = [...obj.childObjectIds];
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
