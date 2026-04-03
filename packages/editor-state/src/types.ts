
import { Project } from '../../ir-schema/dist/index';

export type HtmlSessionMode = 'strict_static' | 'limited' | 'snapshot' | null;

export type SessionPolicyMode = 'default' | 'snapshot_read_only';

export interface SessionPolicyState {
  sessionMode: SessionPolicyMode;
  htmlMode: HtmlSessionMode;
  readOnly: boolean;
  reason: string | null;
}

export interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
}

export interface InteractionState {
  mode: 'idle' | 'dragging' | 'resizing' | 'editing_text';
  activeObjectId: string | null;
}

export interface EditorSessionState {
  project: Project;
  policy: SessionPolicyState;
  selection: SelectionState;
  interaction: InteractionState;
  warnings: string[];
}
