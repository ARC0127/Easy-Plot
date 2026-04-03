"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relayoutPanels = relayoutPanels;
const helpers_1 = require("../helpers");
function relayoutPanels(project, mode = 'horizontal', gap = 12) {
    const next = (0, helpers_1.cloneProject)(project);
    const panels = next.project.figure.panels
        .map(id => (0, helpers_1.getObject)(next, id))
        .filter((o) => o.objectType === 'panel');
    if (panels.length < 2)
        return { project: next, appliedConstraint: null };
    const bounds = (0, helpers_1.getFigureBounds)(next);
    if (mode === 'horizontal') {
        const totalGap = gap * (panels.length - 1);
        const panelWidth = (bounds.w - totalGap) / panels.length;
        let x = bounds.x;
        for (const panel of panels) {
            panel.bbox = { ...panel.bbox, x, y: bounds.y, w: panelWidth, h: bounds.h };
            panel.transform = { ...panel.transform, translate: [0, 0] };
            panel.anchor = { kind: 'absolute', value: null };
            panel.offset = [0, 0];
            x += panelWidth + gap;
        }
    }
    else {
        const totalGap = gap * (panels.length - 1);
        const panelHeight = (bounds.h - totalGap) / panels.length;
        let y = bounds.y;
        for (const panel of panels) {
            panel.bbox = { ...panel.bbox, x: bounds.x, y, w: bounds.w, h: panelHeight };
            panel.transform = { ...panel.transform, translate: [0, 0] };
            panel.anchor = { kind: 'absolute', value: null };
            panel.offset = [0, 0];
            y += panelHeight + gap;
        }
    }
    (0, helpers_1.pushConstraint)(next, mode === 'horizontal' ? 'equal_spacing_horizontal' : 'equal_spacing_vertical', panels.map(p => p.id), null, { gap });
    return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
