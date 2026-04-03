"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keepInsideBounds = keepInsideBounds;
const helpers_1 = require("../helpers");
function keepInsideBounds(project, objectId, targetPanelId) {
    const next = (0, helpers_1.cloneProject)(project);
    const obj = (0, helpers_1.getObject)(next, objectId);
    const bounds = targetPanelId ? (0, helpers_1.getPanelBounds)(next, targetPanelId) : (0, helpers_1.getFigureBounds)(next);
    let x = obj.bbox.x;
    let y = obj.bbox.y;
    x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w - obj.bbox.w));
    y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h - obj.bbox.h));
    obj.transform = {
        ...obj.transform,
        translate: [obj.transform.translate[0] + (x - obj.bbox.x), obj.transform.translate[1] + (y - obj.bbox.y)],
    };
    obj.bbox = { ...obj.bbox, x, y };
    (0, helpers_1.pushConstraint)(next, 'keep_inside_bounds', [objectId], targetPanelId ?? null, {});
    return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
