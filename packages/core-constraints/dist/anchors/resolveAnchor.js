"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAnchor = resolveAnchor;
const helpers_1 = require("../helpers");
function anchorPoint(bounds, value) {
    switch (value) {
        case 'top_left': return { x: bounds.x, y: bounds.y };
        case 'top_right': return { x: bounds.x + bounds.w, y: bounds.y };
        case 'bottom_left': return { x: bounds.x, y: bounds.y + bounds.h };
        case 'bottom_right': return { x: bounds.x + bounds.w, y: bounds.y + bounds.h };
        case 'top_center': return { x: bounds.x + bounds.w / 2, y: bounds.y };
        case 'center': return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
        default: return { x: bounds.x, y: bounds.y };
    }
}
function resolveAnchor(project, objectId) {
    const obj = (0, helpers_1.getObject)(project, objectId);
    if (!('anchor' in obj) || !('offset' in obj)) {
        return { x: obj.bbox.x, y: obj.bbox.y };
    }
    if (obj.anchor.kind === 'free' || obj.anchor.kind === 'absolute') {
        return { x: obj.bbox.x, y: obj.bbox.y };
    }
    const targetBounds = obj.anchor.kind === 'panel_anchor' && obj.anchor.targetPanelId
        ? (0, helpers_1.getPanelBounds)(project, obj.anchor.targetPanelId)
        : (0, helpers_1.getFigureBounds)(project);
    const pt = anchorPoint(targetBounds, obj.anchor.value ?? 'top_left');
    return { x: pt.x + (obj.offset?.[0] ?? 0), y: pt.y + (obj.offset?.[1] ?? 0) };
}
