import { DegradationReason, LiftConfidence, LiftedBy, Provenance } from '../../../ir-schema/dist/index';
import { NormalizedNode } from '../../../core-normalizer/dist/index';
export declare function buildProvenance(params: {
    sourceId: string;
    node: NormalizedNode;
    originFileKind: 'svg' | 'html';
    liftedBy: LiftedBy;
    liftConfidence: LiftConfidence;
    degradationReason: DegradationReason;
}): Provenance;
//# sourceMappingURL=buildProvenance.d.ts.map