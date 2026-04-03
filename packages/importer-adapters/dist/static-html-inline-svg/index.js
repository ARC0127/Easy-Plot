"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectStaticHtmlInlineSvgHints = detectStaticHtmlInlineSvgHints;
function uniqueByNodeId(hints) {
    const seen = new Set();
    const out = [];
    for (const hint of hints) {
        const key = `${hint.kind}:${hint.nodeIds[0]}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(hint);
    }
    return out;
}
function detectStaticHtmlInlineSvgHints(normalized) {
    const hints = [];
    const nodes = Object.values(normalized.nodes);
    for (const node of nodes) {
        const tag = node.tagName.toLowerCase();
        const id = String(node.attributes.id ?? '').toLowerCase();
        const role = String(node.attributes['data-fe-role'] ?? '').toLowerCase();
        const text = String(node.textContent ?? '').toLowerCase();
        if (role === 'panel' || id.includes('panel')) {
            hints.push({
                kind: 'panel_candidate',
                nodeIds: [node.nodeId],
                confidence: role === 'panel' ? 'high' : 'medium',
                evidence: [{
                        adapter: 'static_html_inline_svg_adapter',
                        confidence: role === 'panel' ? 'high' : 'medium',
                        nodeIds: [node.nodeId],
                        reasons: [role === 'panel' ? 'Matched exported data-fe-role=panel' : `Matched panel-like identifier: ${id}`],
                    }],
            });
        }
        if (role === 'legend' || id.includes('legend') || tag === 'figcaption' || text.includes('legend')) {
            hints.push({
                kind: 'legend_candidate',
                nodeIds: [node.nodeId],
                confidence: role === 'legend' || id.includes('legend') ? 'high' : 'medium',
                evidence: [{
                        adapter: 'static_html_inline_svg_adapter',
                        confidence: role === 'legend' || id.includes('legend') ? 'high' : 'medium',
                        nodeIds: [node.nodeId],
                        reasons: [
                            role === 'legend'
                                ? 'Matched exported data-fe-role=legend'
                                : tag === 'figcaption'
                                    ? 'figcaption treated as legend-like floating descriptor'
                                    : id.includes('legend')
                                        ? `Matched legend-like identifier: ${id}`
                                        : 'Legend keyword found in text content',
                        ],
                    }],
            });
        }
    }
    if (!hints.some((hint) => hint.kind === 'panel_candidate')) {
        const fallbackPanels = nodes.filter((node) => node.tagName.toLowerCase() === 'div').slice(0, 2);
        for (const panel of fallbackPanels) {
            hints.push({
                kind: 'panel_candidate',
                nodeIds: [panel.nodeId],
                confidence: 'low',
                evidence: [{
                        adapter: 'static_html_inline_svg_adapter',
                        confidence: 'low',
                        nodeIds: [panel.nodeId],
                        reasons: ['Fallback: first two div blocks treated as panel candidates'],
                    }],
            });
        }
    }
    return uniqueByNodeId(hints);
}
