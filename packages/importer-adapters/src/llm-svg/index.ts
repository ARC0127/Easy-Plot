import { AdapterHint } from '../types';
import { NormalizedDocument } from '../../../core-normalizer/dist/index';

function makeHint(kind: AdapterHint['kind'], nodeId: string, confidence: AdapterHint['confidence'], reason: string): AdapterHint {
  return {
    kind,
    nodeIds: [nodeId],
    confidence,
    evidence: [{ adapter: 'llm_svg_adapter', confidence, nodeIds: [nodeId], reasons: [reason] }],
  };
}

export function detectLlmSvgHints(normalized: NormalizedDocument): AdapterHint[] {
  const hints: AdapterHint[] = [];
  const nodes = Object.values(normalized.nodes);
  const groups = nodes.filter((node) => node.nodeKind === 'group');
  const textNodes = nodes.filter((node) => node.nodeKind === 'text');
  const panelCandidates = nodes.filter((node) => {
    const role = String(node.attributes['data-fe-role'] ?? '').toLowerCase();
    const id = String(node.attributes.id ?? '').toLowerCase();
    return role === 'panel' || /^panel[_-]/.test(id) || /^axes[_-]/.test(id);
  });

  for (const candidate of panelCandidates) {
    const role = String(candidate.attributes['data-fe-role'] ?? '').toLowerCase();
    const id = String(candidate.attributes.id ?? '');
    hints.push(
      makeHint(
        'panel_candidate',
        candidate.nodeId,
        role === 'panel' ? 'high' : 'medium',
        role === 'panel' ? 'Matched exported data-fe-role=panel' : `Matched panel-like id: ${id}`
      )
    );
  }

  if (!hints.some((hint) => hint.kind === 'panel_candidate')) {
    const nonRootGroups = groups.filter((node) => node.tagName.toLowerCase() === 'g').slice(0, 2);
    for (const group of nonRootGroups) {
      hints.push(makeHint('panel_candidate', group.nodeId, 'low', 'Fallback: first two <g> nodes treated as panel candidates'));
    }
  }

  const legendCandidates = [...groups, ...textNodes].filter((node) => {
    const role = String(node.attributes['data-fe-role'] ?? '').toLowerCase();
    const id = String(node.attributes.id ?? '').toLowerCase();
    const text = String(node.textContent ?? '').toLowerCase();
    return role === 'legend' || id.includes('legend') || text.includes('legend');
  });

  for (const candidate of legendCandidates) {
    const role = String(candidate.attributes['data-fe-role'] ?? '').toLowerCase();
    const id = String(candidate.attributes.id ?? '');
    hints.push(
      makeHint(
        'legend_candidate',
        candidate.nodeId,
        role === 'legend' || id.toLowerCase().includes('legend') ? 'high' : 'medium',
        role === 'legend'
          ? 'Matched exported data-fe-role=legend'
          : id.toLowerCase().includes('legend')
          ? `Matched legend-like id: ${id}`
          : 'Legend keyword found in text content'
      )
    );
  }

  const dedup = new Map<string, AdapterHint>();
  for (const hint of hints) {
    const key = `${hint.kind}:${hint.nodeIds[0]}`;
    const prev = dedup.get(key);
    if (!prev || (prev.confidence === 'low' && hint.confidence !== 'low') || (prev.confidence === 'medium' && hint.confidence === 'high')) {
      dedup.set(key, hint);
    }
  }

  return [...dedup.values()];
}
