
import { Project } from '../../ir-schema/dist/index';
import { Operation } from './operationTypes';

export interface UndoRedoState {
  project: Project;
}

function cloneProject(project: Project): Project {
  return structuredClone(project) as Project;
}

export function pushSnapshot(project: Project): Project {
  const next = cloneProject(project);
  next.project.history.undoStack.push(cloneProject(project) as unknown as Record<string, unknown>);
  next.project.history.redoStack = [];
  return next;
}

export function undo(project: Project): Project {
  const prev = project.project.history.undoStack.pop() as unknown as Project | undefined;
  if (!prev) return project;
  const current = cloneProject(project);
  prev.project.history.redoStack.push(current as unknown as Record<string, unknown>);
  return prev;
}

export function redo(project: Project): Project {
  const next = project.project.history.redoStack.pop() as unknown as Project | undefined;
  if (!next) return project;
  const current = cloneProject(project);
  next.project.history.undoStack.push(current as unknown as Record<string, unknown>);
  return next;
}

export function appendOperationLog(project: Project, operation: Operation): void {
  project.project.history.operationLog.push({
    ts: new Date().toISOString(),
    operation,
  });
}
