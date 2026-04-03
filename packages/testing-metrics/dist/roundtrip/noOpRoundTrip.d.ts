import { OriginalSourceRef, Project } from '../../../ir-schema/dist/index';
import { computeVisualEquivalence } from '../visual/computeVisualEquivalence';
import { computeInteractionRetention } from '../interaction/retention';
import { reimportExportedArtifact } from './reimportExportedArtifact';
export interface NoOpRoundTripReport {
    before: Project;
    after: Project;
    svgContent: string;
    reimport: ReturnType<typeof reimportExportedArtifact>;
    structureRetention: {
        pass: boolean;
        missingObjectIds: string[];
    };
    degradedObjectWarnings: string[];
    visual: ReturnType<typeof computeVisualEquivalence>;
    retention: ReturnType<typeof computeInteractionRetention>;
}
export declare function noOpRoundTrip(project: Project, source: OriginalSourceRef): NoOpRoundTripReport;
//# sourceMappingURL=noOpRoundTrip.d.ts.map