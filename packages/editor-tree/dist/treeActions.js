"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setObjectVisibility = setObjectVisibility;
exports.setObjectLocked = setObjectLocked;
function setObjectVisibility(project, objectId, visible) {
    const next = structuredClone(project);
    const obj = next.project.objects[objectId];
    if (obj)
        obj.visible = visible;
    return next;
}
function setObjectLocked(project, objectId, locked) {
    const next = structuredClone(project);
    const obj = next.project.objects[objectId];
    if (obj)
        obj.locked = locked;
    return next;
}
