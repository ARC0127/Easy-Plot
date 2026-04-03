import { OriginalSourceRef } from '../../../ir-schema/dist/index';
import { EditorSessionState } from '../types';
export interface ImportFileRef {
    path: string;
    content: string;
}
export interface ImportIntoSessionOptions {
    htmlMode?: 'strict_static' | 'limited' | 'snapshot';
}
export declare function importIntoSession(file: ImportFileRef, source: OriginalSourceRef, options?: ImportIntoSessionOptions): EditorSessionState;
//# sourceMappingURL=importActions.d.ts.map