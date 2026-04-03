import { AdapterHint } from '../types';
import { NormalizedDocument } from '../../../core-normalizer/dist/index';

export function detectIllustrationLikeHints(normalized: NormalizedDocument): AdapterHint[] {
  const groups = Object.values(normalized.nodes).filter(n => n.nodeKind === 'group');
  const hints: AdapterHint[] = [];
  if (groups.length > 0) {
    hints.push({
      kind: 'panel_candidate',
      nodeIds: [groups[0].nodeId],
      confidence: 'low',
      evidence: [{ adapter: 'illustration_adapter', confidence: 'low', nodeIds: [groups[0].nodeId], reasons: ['First group treated as panel candidate for illustration-like input'] }],
    });
  }
  return hints;
}
