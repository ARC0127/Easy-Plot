"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendManualEdit = appendManualEdit;
function nowIso() {
    return new Date().toISOString();
}
function appendManualEdit(obj, kind, before, after, reason) {
    const record = {
        editId: `me_${obj.id}_${obj.manualEdits.length + 1}`,
        kind,
        timestamp: nowIso(),
        before,
        after,
        reason,
    };
    obj.manualEdits.push(record);
}
