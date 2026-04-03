import { DegradationReason, LiftConfidence, LiftedBy, Provenance } from '../../../ir-schema/dist/index';
import { NormalizedNode } from '../../../core-normalizer/dist/index';

export function buildProvenance(params: {
  sourceId: string;
  node: NormalizedNode;
  originFileKind: 'svg' | 'html';
  liftedBy: LiftedBy;
  liftConfidence: LiftConfidence;
  degradationReason: DegradationReason;
}): Provenance {
  return {
    originFileKind: params.originFileKind,
    originSourceId: params.sourceId,
    originNodeIds: [params.node.nodeId],
    originSelectorOrPath: params.node.attributes.id ? `#${params.node.attributes.id}` : params.node.tagName,
    originBBox: params.node.bbox,
    originStyleSnapshot: params.node.styles,
    liftedBy: params.liftedBy,
    liftConfidence: params.liftConfidence,
    degradationReason: params.degradationReason,
  };
}
