import { ImportRecord, OriginalSourceRef, Project } from '../../ir-schema/dist/index';
import { AdapterHints } from '../../importer-adapters/dist/index';
import { NormalizedDocument } from '../../core-normalizer/dist/index';
export declare function buildProject(normalized: NormalizedDocument, hints: AdapterHints, source: OriginalSourceRef): {
    project: Project;
    importRecord: ImportRecord;
};
//# sourceMappingURL=buildProject.d.ts.map