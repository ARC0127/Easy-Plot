
import { Project } from '../../ir-schema/dist/index';
import { EditorSessionState, HtmlSessionMode, SessionPolicyMode } from './types';

export interface CreateEditorSessionOptions {
  htmlMode?: HtmlSessionMode;
  policyMode?: SessionPolicyMode;
  reason?: string | null;
}

function deriveHtmlMode(project: Project): HtmlSessionMode {
  const tags = project.project.figure.metadata.tags;
  const modeTag = tags.find((tag) => tag.startsWith('html_mode:'));
  if (!modeTag) return null;
  const mode = modeTag.slice('html_mode:'.length);
  return mode === 'strict_static' || mode === 'limited' || mode === 'snapshot' ? mode : null;
}

function derivePolicyMode(project: Project): SessionPolicyMode {
  return project.project.figure.metadata.tags.includes('session:snapshot_read_only') ? 'snapshot_read_only' : 'default';
}

export function createEditorSession(project: Project, options: CreateEditorSessionOptions = {}): EditorSessionState {
  const policyMode = options.policyMode ?? derivePolicyMode(project);
  const htmlMode = options.htmlMode ?? deriveHtmlMode(project);
  return {
    project,
    policy: {
      sessionMode: policyMode,
      htmlMode,
      readOnly: policyMode === 'snapshot_read_only',
      reason: policyMode === 'snapshot_read_only' ? options.reason ?? 'snapshot_policy' : null,
    },
    selection: { selectedIds: [], hoveredId: null },
    interaction: { mode: 'idle', activeObjectId: null },
    warnings: [],
  };
}

export function setProject(state: EditorSessionState, project: Project): EditorSessionState {
  return { ...state, project };
}
