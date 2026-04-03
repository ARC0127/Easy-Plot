import { Project } from '../../ir-schema/dist/index';
import { Operation } from './operationTypes';
export interface UndoRedoState {
    project: Project;
}
export declare function pushSnapshot(project: Project): Project;
export declare function undo(project: Project): Project;
export declare function redo(project: Project): Project;
export declare function appendOperationLog(project: Project, operation: Operation): void;
//# sourceMappingURL=undoRedo.d.ts.map