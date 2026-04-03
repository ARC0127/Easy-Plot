import { align, distribute, keepInsideBounds, relayoutPanels, setAnchor } from '../../../core-constraints/dist/index';
import { EditorSessionState } from '../types';

export function setAnchorForSelected(
  state: EditorSessionState,
  anchor: { kind: 'figure_anchor' | 'panel_anchor' | 'free' | 'absolute'; value: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center' | 'top_center' | null; targetPanelId?: string | null },
  offset: [number, number],
): EditorSessionState {
  if (state.selection.selectedIds.length !== 1) return state;
  const { project } = setAnchor(state.project, state.selection.selectedIds[0], anchor, offset);
  return { ...state, project };
}

export function alignSelected(state: EditorSessionState, mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): EditorSessionState {
  const { project } = align(state.project, state.selection.selectedIds, mode);
  return { ...state, project };
}

export function distributeSelected(state: EditorSessionState, mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): EditorSessionState {
  const { project } = distribute(state.project, state.selection.selectedIds, mode);
  return { ...state, project };
}

export function keepSelectedInside(state: EditorSessionState, panelId?: string | null): EditorSessionState {
  let next = state;
  for (const id of state.selection.selectedIds) {
    const result = keepInsideBounds(next.project, id, panelId ?? null);
    next = { ...next, project: result.project };
  }
  return next;
}

export function relayoutAllPanels(state: EditorSessionState, mode: 'horizontal' | 'vertical' = 'horizontal', gap = 12): EditorSessionState {
  const { project } = relayoutPanels(state.project, mode, gap);
  return { ...state, project };
}
