"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSelectionOverlay = buildSelectionOverlay;
function buildSelectionOverlay(project, selectedIds) {
    return selectedIds
        .map(id => project.project.objects[id])
        .filter(Boolean)
        .map(obj => ({ objectId: obj.id, x: obj.bbox.x, y: obj.bbox.y, w: obj.bbox.w, h: obj.bbox.h }));
}
