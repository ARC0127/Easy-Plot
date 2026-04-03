"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTreeViewModel = buildTreeViewModel;
function toNode(obj, project) {
    const childIds = 'childObjectIds' in obj && Array.isArray(obj.childObjectIds) ? obj.childObjectIds : [];
    return {
        id: obj.id,
        label: obj.name,
        objectType: obj.objectType,
        visible: obj.visible,
        locked: obj.locked,
        capabilities: [...obj.capabilities],
        children: childIds.map(id => project.project.objects[id]).filter(Boolean).map(child => toNode(child, project)),
    };
}
function buildTreeViewModel(project) {
    const roots = [
        ...project.project.figure.panels,
        ...project.project.figure.legends,
        ...project.project.figure.floatingObjects,
    ];
    const seen = new Set();
    const nodes = [];
    for (const id of roots) {
        if (seen.has(id))
            continue;
        const obj = project.project.objects[id];
        if (!obj)
            continue;
        seen.add(id);
        nodes.push(toNode(obj, project));
    }
    return nodes;
}
