"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOperation = runOperation;
exports.moveSelected = moveSelected;
exports.deleteSelected = deleteSelected;
exports.editSelectedText = editSelectedText;
exports.promoteSelected = promoteSelected;
const index_1 = require("../../../core-history/dist/index");
const index_2 = require("../../../ir-schema/dist/index");
function assertSessionWritable(state, operationType) {
    if (!state.policy.readOnly)
        return;
    throw new index_2.FigureEditorError('ERR_CAPABILITY_CONFLICT', `Session is read-only (${state.policy.reason ?? 'snapshot_policy'}); operation ${operationType} is blocked.`, {
        sessionMode: state.policy.sessionMode,
        htmlMode: state.policy.htmlMode,
        operationType,
    });
}
function runOperation(state, operation) {
    assertSessionWritable(state, operation.type);
    const project = (0, index_1.applyOperation)(state.project, operation);
    return { ...state, project };
}
function moveSelected(state, dx, dy) {
    let next = state;
    for (const objectId of state.selection.selectedIds) {
        next = runOperation(next, { type: 'MOVE_OBJECT', payload: { objectId, delta: { x: dx, y: dy } } });
    }
    return next;
}
function deleteSelected(state) {
    let next = state;
    for (const objectId of state.selection.selectedIds) {
        next = runOperation(next, { type: 'DELETE_OBJECT', payload: { objectId } });
    }
    return { ...next, selection: { ...next.selection, selectedIds: [] } };
}
function editSelectedText(state, content) {
    if (state.selection.selectedIds.length !== 1)
        return state;
    return runOperation(state, { type: 'EDIT_TEXT_CONTENT', payload: { objectId: state.selection.selectedIds[0], content } });
}
function promoteSelected(state, role, reason = 'manual_promote') {
    return runOperation(state, { type: 'PROMOTE_SELECTION', payload: { objectIds: [...state.selection.selectedIds], role, reason } });
}
