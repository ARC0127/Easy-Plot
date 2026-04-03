
import { AcceptanceSummary } from '../reports/types';

export function globalPass(summaries: AcceptanceSummary[]): boolean {
  const byFamily = new Map(summaries.map(s => [s.family, s]));
  const mustPass = ['matplotlib', 'llm_svg', 'static_html_inline_svg'];
  if (mustPass.some(f => !byFamily.get(f)?.pass)) return false;
  const extraFamilies = summaries.filter(s => !mustPass.includes(s.family) && s.pass).length;
  if (extraFamilies < 2) return false;

  const degraded = byFamily.get('degraded_svg');
  if (!degraded) return false;
  if (degraded.pass) return true;

  const honestLabelingRate = degraded.metrics['editable_or_honestly_labeled_rate'] ?? 0;
  const rasterLabelRate = degraded.metrics['raster_block_correct_label_rate'] ?? 0;
  return honestLabelingRate >= 0.95 && rasterLabelRate >= 0.98;
}
