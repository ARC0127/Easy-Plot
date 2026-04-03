import { FamilyClass } from '../../ir-schema/dist/index';
import { NormalizedDocument } from '../../core-normalizer/dist/index';

export function classifyFamily(normalized: NormalizedDocument): FamilyClass {
  const nodes = Object.values(normalized.nodes);
  const ids = nodes.map(n => n.attributes.id ?? '');
  const roles = nodes.map(n => String(n.attributes['data-fe-role'] ?? ''));
  const tags = nodes.map(n => n.tagName.toLowerCase());
  const textCount = nodes.filter(n => n.nodeKind === 'text').length;
  const imageCount = nodes.filter(n => n.nodeKind === 'image').length;
  const pathCount = nodes.filter(n => n.tagName.toLowerCase() === 'path').length;

  if (roles.some(r => r === 'panel' || r === 'legend')) {
    return normalized.kind === 'html' ? 'static_html_inline_svg' : 'llm_svg';
  }
  if (normalized.kind === 'html') {
    const hasScript = tags.includes('script');
    return hasScript ? 'unknown' : 'static_html_inline_svg';
  }
  if (ids.some(id => /^axes_\d+/.test(id)) || ids.some(id => /^patch_\d+/.test(id)) || ids.some(id => /^text_\d+/.test(id))) {
    return 'matplotlib';
  }
  if (nodes.some(n => String(n.attributes.class ?? '').toLowerCase().includes('plotly')) || nodes.some(n => String(n.attributes['data-chart'] ?? '').length > 0)) {
    return 'chart_family';
  }
  if (textCount === 0 && (imageCount > 0 || pathCount > 10)) {
    return 'degraded_svg';
  }
  if (imageCount === 0 && textCount > 0 && pathCount > 0) {
    return 'illustration_like';
  }
  return 'llm_svg';
}
