"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushSnapshot = pushSnapshot;
exports.undo = undo;
exports.redo = redo;
exports.appendOperationLog = appendOperationLog;
function cloneProject(project) {
    return structuredClone(project);
}
function pushSnapshot(project) {
    const next = cloneProject(project);
    next.project.history.undoStack.push(cloneProject(project));
    next.project.history.redoStack = [];
    return next;
}
function undo(project) {
    const prev = project.project.history.undoStack.pop();
    if (!prev)
        return project;
    const current = cloneProject(project);
    prev.project.history.redoStack.push(current);
    return prev;
}
function redo(project) {
    const next = project.project.history.redoStack.pop();
    if (!next)
        return project;
    const current = cloneProject(project);
    next.project.history.undoStack.push(current);
    return next;
}
function appendOperationLog(project, operation) {
    project.project.history.operationLog.push({
        ts: new Date().toISOString(),
        operation,
    });
}
