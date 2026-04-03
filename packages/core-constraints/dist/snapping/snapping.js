"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapPoint = snapPoint;
const guides_1 = require("./guides");
function snapPoint(project, x, y, threshold = 6) {
    const guides = (0, guides_1.buildGuides)(project);
    let bestX = x;
    let bestY = y;
    let snappedX = false;
    let snappedY = false;
    let bestDx = Number.POSITIVE_INFINITY;
    let bestDy = Number.POSITIVE_INFINITY;
    const guideIds = [];
    for (const g of guides) {
        if (g.orientation === 'vertical') {
            const dx = Math.abs(g.position - x);
            if (dx <= threshold && dx < bestDx) {
                bestDx = dx;
                bestX = g.position;
                snappedX = true;
            }
        }
        else {
            const dy = Math.abs(g.position - y);
            if (dy <= threshold && dy < bestDy) {
                bestDy = dy;
                bestY = g.position;
                snappedY = true;
            }
        }
    }
    if (snappedX) {
        for (const g of guides) {
            if (g.orientation === 'vertical' && g.position === bestX)
                guideIds.push(g.id);
        }
    }
    if (snappedY) {
        for (const g of guides) {
            if (g.orientation === 'horizontal' && g.position === bestY)
                guideIds.push(g.id);
        }
    }
    return { x: bestX, y: bestY, snappedX, snappedY, guideIds: Array.from(new Set(guideIds)) };
}
