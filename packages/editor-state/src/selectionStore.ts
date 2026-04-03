
import { EditorSessionState } from './types';

export function selectObject(state: EditorSessionState, objectId: string): EditorSessionState {
  return { ...state, selection: { ...state.selection, selectedIds: [objectId] } };
}

export function multiSelectObjects(state: EditorSessionState, objectIds: string[]): EditorSessionState {
  return { ...state, selection: { ...state.selection, selectedIds: [...objectIds] } };
}

export function clearSelection(state: EditorSessionState): EditorSessionState {
  return { ...state, selection: { ...state.selection, selectedIds: [] } };
}

export function setHoveredObject(state: EditorSessionState, objectId: string | null): EditorSessionState {
  return { ...state, selection: { ...state.selection, hoveredId: objectId } };
}
