import { NormalizedDocument } from '../../../core-normalizer/dist/index';
import { AdapterHint } from '../types';

export function detectDegradedSvgHints(normalized: NormalizedDocument): AdapterHint[] {
  const imageNodes = Object.values(normalized.nodes)
    .filter((node) => node.nodeKind === 'image')
    .sort((a, b) => {
      const areaA = (a.bbox?.w ?? 0) * (a.bbox?.h ?? 0);
      const areaB = (b.bbox?.w ?? 0) * (b.bbox?.h ?? 0);
      return areaB - areaA;
    });

  if (imageNodes.length === 0) return [];
  const panelNode = imageNodes[0];

  return [
    {
      kind: 'panel_candidate',
      nodeIds: [panelNode.nodeId],
      confidence: 'medium',
      evidence: [{
        adapter: 'degraded_svg_adapter',
        confidence: 'medium',
        nodeIds: [panelNode.nodeId],
        reasons: ['Largest raster/image block treated as degraded panel candidate'],
      }],
    },
  ];
}
