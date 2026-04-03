import { EditorSessionState } from '../types';
export declare function setAnchorForSelected(state: EditorSessionState, anchor: {
    kind: 'figure_anchor' | 'panel_anchor' | 'free' | 'absolute';
    value: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center' | 'top_center' | null;
    targetPanelId?: string | null;
}, offset: [number, number]): EditorSessionState;
export declare function alignSelected(state: EditorSessionState, mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): EditorSessionState;
export declare function distributeSelected(state: EditorSessionState, mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): EditorSessionState;
export declare function keepSelectedInside(state: EditorSessionState, panelId?: string | null): EditorSessionState;
export declare function relayoutAllPanels(state: EditorSessionState, mode?: 'horizontal' | 'vertical', gap?: number): EditorSessionState;
//# sourceMappingURL=constraintActions.d.ts.map