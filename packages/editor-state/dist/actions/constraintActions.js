"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAnchorForSelected = setAnchorForSelected;
exports.alignSelected = alignSelected;
exports.distributeSelected = distributeSelected;
exports.keepSelectedInside = keepSelectedInside;
exports.relayoutAllPanels = relayoutAllPanels;
const index_1 = require("../../../core-constraints/dist/index");
function setAnchorForSelected(state, anchor, offset) {
    if (state.selection.selectedIds.length !== 1)
        return state;
    const { project } = (0, index_1.setAnchor)(state.project, state.selection.selectedIds[0], anchor, offset);
    return { ...state, project };
}
function alignSelected(state, mode) {
    const { project } = (0, index_1.align)(state.project, state.selection.selectedIds, mode);
    return { ...state, project };
}
function distributeSelected(state, mode) {
    const { project } = (0, index_1.distribute)(state.project, state.selection.selectedIds, mode);
    return { ...state, project };
}
function keepSelectedInside(state, panelId) {
    let next = state;
    for (const id of state.selection.selectedIds) {
        const result = (0, index_1.keepInsideBounds)(next.project, id, panelId ?? null);
        next = { ...next, project: result.project };
    }
    return next;
}
function relayoutAllPanels(state, mode = 'horizontal', gap = 12) {
    const { project } = (0, index_1.relayoutPanels)(state.project, mode, gap);
    return { ...state, project };
}
