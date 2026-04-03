"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectObject = selectObject;
exports.multiSelectObjects = multiSelectObjects;
exports.clearSelection = clearSelection;
exports.setHoveredObject = setHoveredObject;
function selectObject(state, objectId) {
    return { ...state, selection: { ...state.selection, selectedIds: [objectId] } };
}
function multiSelectObjects(state, objectIds) {
    return { ...state, selection: { ...state.selection, selectedIds: [...objectIds] } };
}
function clearSelection(state) {
    return { ...state, selection: { ...state.selection, selectedIds: [] } };
}
function setHoveredObject(state, objectId) {
    return { ...state, selection: { ...state.selection, hoveredId: objectId } };
}
