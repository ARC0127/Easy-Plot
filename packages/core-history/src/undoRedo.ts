
import { Project } from '../../ir-schema/dist/index';
import { Operation } from './operationTypes';

export interface UndoRedoState {
  project: Project;
}

const MAX_HISTORY_DEPTH = 64;
const MAX_OPERATION_LOG = 200;

function cloneProject(project: Project): Project {
  return structuredClone(project) as Project;
}

function cloneProjectForHistory(project: Project): Project {
  const next = cloneProject(project);
  next.project.history.undoStack = [];
  next.project.history.redoStack = [];
  return next;
}

function trimHistoryStack(stack: Record<string, unknown>[]): void {
  if (stack.length <= MAX_HISTORY_DEPTH) return;
  stack.splice(0, stack.length - MAX_HISTORY_DEPTH);
}

export function pushSnapshot(project: Project): Project {
  const next = cloneProject(project);
  next.project.history.undoStack.push(cloneProjectForHistory(project) as unknown as Record<string, unknown>);
  trimHistoryStack(next.project.history.undoStack);
  next.project.history.redoStack = [];
  return next;
}

export function undo(project: Project): Project {
  const prev = project.project.history.undoStack.pop() as unknown as Project | undefined;
  if (!prev) return project;
  const current = cloneProjectForHistory(project);
  prev.project.history.undoStack = [...project.project.history.undoStack];
  prev.project.history.redoStack = [...project.project.history.redoStack, current as unknown as Record<string, unknown>];
  trimHistoryStack(prev.project.history.redoStack);
  return prev;
}

export function redo(project: Project): Project {
  const next = project.project.history.redoStack.pop() as unknown as Project | undefined;
  if (!next) return project;
  const current = cloneProjectForHistory(project);
  next.project.history.undoStack = [...project.project.history.undoStack, current as unknown as Record<string, unknown>];
  trimHistoryStack(next.project.history.undoStack);
  next.project.history.redoStack = [...project.project.history.redoStack];
  return next;
}

export function appendOperationLog(project: Project, operation: Operation): void {
  project.project.history.operationLog.push({
    ts: new Date().toISOString(),
    operation,
  });
  if (project.project.history.operationLog.length > MAX_OPERATION_LOG) {
    project.project.history.operationLog.splice(0, project.project.history.operationLog.length - MAX_OPERATION_LOG);
  }
}
