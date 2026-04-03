import { AdapterHint } from '../types';
import { NormalizedDocument } from '../../../core-normalizer/dist/index';

export function detectMatplotlibHints(normalized: NormalizedDocument): AdapterHint[] {
  const hints: AdapterHint[] = [];
  const legendIdNodes = Object.values(normalized.nodes).filter(node => /legend/i.test(node.attributes.id ?? '') || node.attributes['data-fe-role'] === 'legend');

  for (const node of Object.values(normalized.nodes)) {
    const id = node.attributes.id ?? '';
    if (/^axes_\d+/.test(id) || node.attributes['data-fe-role'] === 'panel') {
      hints.push({
        kind: 'panel_candidate',
        nodeIds: [node.nodeId],
        confidence: node.attributes['data-fe-role'] === 'panel' ? 'high' : 'high',
        evidence: [{ adapter: 'matplotlib_adapter', confidence: 'high', nodeIds: [node.nodeId], reasons: [node.attributes['data-fe-role'] === 'panel' ? 'Matched exported data-fe-role=panel' : `Matched matplotlib axes id ${id}`] }],
      });
    }
  }

  if (legendIdNodes.length > 0) {
    for (const node of legendIdNodes) {
      hints.push({
        kind: 'legend_candidate',
        nodeIds: [node.nodeId],
        confidence: 'high',
        evidence: [{ adapter: 'matplotlib_adapter', confidence: 'high', nodeIds: [node.nodeId], reasons: ['Matched legend-like identifier or exported data-fe-role=legend'] }],
      });
    }
  } else {
    const legendText = Object.values(normalized.nodes).find(node => /legend/i.test(node.textContent ?? ''));
    if (legendText) {
      hints.push({
        kind: 'legend_candidate',
        nodeIds: [legendText.nodeId],
        confidence: 'medium',
        evidence: [{ adapter: 'matplotlib_adapter', confidence: 'medium', nodeIds: [legendText.nodeId], reasons: ['Matched legend-like text content fallback'] }],
      });
    }
  }

  return hints;
}
