
import { applyOperation, Operation } from '../../../core-history/dist/index';
import { FigureEditorError } from '../../../ir-schema/dist/index';
import { EditorSessionState } from '../types';

function assertSessionWritable(state: EditorSessionState, operationType: Operation['type']): void {
  if (!state.policy.readOnly) return;
  throw new FigureEditorError(
    'ERR_CAPABILITY_CONFLICT',
    `Session is read-only (${state.policy.reason ?? 'snapshot_policy'}); operation ${operationType} is blocked.`,
    {
      sessionMode: state.policy.sessionMode,
      htmlMode: state.policy.htmlMode,
      operationType,
    }
  );
}

export function runOperation(state: EditorSessionState, operation: Operation): EditorSessionState {
  assertSessionWritable(state, operation.type);
  const project = applyOperation(state.project, operation);
  return { ...state, project };
}

export function moveSelected(state: EditorSessionState, dx: number, dy: number): EditorSessionState {
  if (state.selection.selectedIds.length === 0) return state;
  return runOperation(state, {
    type: 'MOVE_OBJECTS',
    payload: {
      objectIds: [...state.selection.selectedIds],
      delta: { x: dx, y: dy },
    },
  });
}

export function deleteSelected(state: EditorSessionState): EditorSessionState {
  if (state.selection.selectedIds.length === 0) return state;
  const next = runOperation(state, {
    type: 'DELETE_OBJECTS',
    payload: { objectIds: [...state.selection.selectedIds] },
  });
  return { ...next, selection: { ...next.selection, selectedIds: [] } };
}

export function editSelectedText(state: EditorSessionState, content: string): EditorSessionState {
  if (state.selection.selectedIds.length !== 1) return state;
  return runOperation(state, { type: 'EDIT_TEXT_CONTENT', payload: { objectId: state.selection.selectedIds[0], content } });
}

export function promoteSelected(state: EditorSessionState, role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason = 'manual_promote'): EditorSessionState {
  return runOperation(state, { type: 'PROMOTE_SELECTION', payload: { objectIds: [...state.selection.selectedIds], role, reason } });
}
