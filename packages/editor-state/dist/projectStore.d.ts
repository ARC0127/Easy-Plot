import { Project } from '../../ir-schema/dist/index';
import { EditorSessionState, HtmlSessionMode, SessionPolicyMode } from './types';
export interface CreateEditorSessionOptions {
    htmlMode?: HtmlSessionMode;
    policyMode?: SessionPolicyMode;
    reason?: string | null;
}
export declare function createEditorSession(project: Project, options?: CreateEditorSessionOptions): EditorSessionState;
export declare function setProject(state: EditorSessionState, project: Project): EditorSessionState;
//# sourceMappingURL=projectStore.d.ts.map