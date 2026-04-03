import { EditorSessionState } from './types';
export declare function selectObject(state: EditorSessionState, objectId: string): EditorSessionState;
export declare function multiSelectObjects(state: EditorSessionState, objectIds: string[]): EditorSessionState;
export declare function clearSelection(state: EditorSessionState): EditorSessionState;
export declare function setHoveredObject(state: EditorSessionState, objectId: string | null): EditorSessionState;
//# sourceMappingURL=selectionStore.d.ts.map