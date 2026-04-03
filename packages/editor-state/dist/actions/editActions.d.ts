import { Operation } from '../../../core-history/dist/index';
import { EditorSessionState } from '../types';
export declare function runOperation(state: EditorSessionState, operation: Operation): EditorSessionState;
export declare function moveSelected(state: EditorSessionState, dx: number, dy: number): EditorSessionState;
export declare function deleteSelected(state: EditorSessionState): EditorSessionState;
export declare function editSelectedText(state: EditorSessionState, content: string): EditorSessionState;
export declare function promoteSelected(state: EditorSessionState, role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason?: string): EditorSessionState;
//# sourceMappingURL=editActions.d.ts.map