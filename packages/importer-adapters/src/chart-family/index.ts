import { AdapterHint } from '../types';
import { NormalizedDocument } from '../../../core-normalizer/dist/index';

export function detectChartFamilyHints(normalized: NormalizedDocument): AdapterHint[] {
  const groupNodes = Object.values(normalized.nodes).filter(n => n.nodeKind === 'group');
  return groupNodes.slice(0, 2).map((node, idx) => ({
    kind: idx === 0 ? 'panel_candidate' : 'legend_candidate',
    nodeIds: [node.nodeId],
    confidence: 'low',
    evidence: [{ adapter: 'chart_adapter', confidence: 'low', nodeIds: [node.nodeId], reasons: ['Fallback chart-family grouping heuristic'] }],
  }));
}
