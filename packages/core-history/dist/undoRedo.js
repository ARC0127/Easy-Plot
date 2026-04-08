"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushSnapshot = pushSnapshot;
exports.undo = undo;
exports.redo = redo;
exports.appendOperationLog = appendOperationLog;
const MAX_HISTORY_DEPTH = 64;
const MAX_OPERATION_LOG = 200;
function cloneProject(project) {
    return structuredClone(project);
}
function cloneProjectForHistory(project) {
    const next = cloneProject(project);
    next.project.history.undoStack = [];
    next.project.history.redoStack = [];
    return next;
}
function trimHistoryStack(stack) {
    if (stack.length <= MAX_HISTORY_DEPTH)
        return;
    stack.splice(0, stack.length - MAX_HISTORY_DEPTH);
}
function pushSnapshot(project) {
    const next = cloneProject(project);
    next.project.history.undoStack.push(cloneProjectForHistory(project));
    trimHistoryStack(next.project.history.undoStack);
    next.project.history.redoStack = [];
    return next;
}
function undo(project) {
    const prev = project.project.history.undoStack.pop();
    if (!prev)
        return project;
    const current = cloneProjectForHistory(project);
    prev.project.history.undoStack = [...project.project.history.undoStack];
    prev.project.history.redoStack = [...project.project.history.redoStack, current];
    trimHistoryStack(prev.project.history.redoStack);
    return prev;
}
function redo(project) {
    const next = project.project.history.redoStack.pop();
    if (!next)
        return project;
    const current = cloneProjectForHistory(project);
    next.project.history.undoStack = [...project.project.history.undoStack, current];
    trimHistoryStack(next.project.history.undoStack);
    next.project.history.redoStack = [...project.project.history.redoStack];
    return next;
}
function appendOperationLog(project, operation) {
    project.project.history.operationLog.push({
        ts: new Date().toISOString(),
        operation,
    });
    if (project.project.history.operationLog.length > MAX_OPERATION_LOG) {
        project.project.history.operationLog.splice(0, project.project.history.operationLog.length - MAX_OPERATION_LOG);
    }
}
