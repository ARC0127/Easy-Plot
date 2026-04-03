"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProvenance = buildProvenance;
function buildProvenance(params) {
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
