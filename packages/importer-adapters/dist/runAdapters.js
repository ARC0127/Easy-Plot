"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdapters = runAdapters;
const chart_family_1 = require("./chart-family");
const degraded_svg_1 = require("./degraded-svg");
const illustration_like_1 = require("./illustration-like");
const llm_svg_1 = require("./llm-svg");
const matplotlib_1 = require("./matplotlib");
const static_html_inline_svg_1 = require("./static-html-inline-svg");
function runAdapters(normalized, family) {
    let hints = [];
    switch (family) {
        case 'matplotlib':
            hints = (0, matplotlib_1.detectMatplotlibHints)(normalized);
            break;
        case 'chart_family':
            hints = (0, chart_family_1.detectChartFamilyHints)(normalized);
            break;
        case 'illustration_like':
            hints = (0, illustration_like_1.detectIllustrationLikeHints)(normalized);
            break;
        case 'llm_svg':
            hints = (0, llm_svg_1.detectLlmSvgHints)(normalized);
            break;
        case 'static_html_inline_svg':
            hints = (0, static_html_inline_svg_1.detectStaticHtmlInlineSvgHints)(normalized);
            break;
        case 'degraded_svg':
            hints = (0, degraded_svg_1.detectDegradedSvgHints)(normalized);
            break;
        default:
            hints = [];
    }
    return { family, hints, evidence: hints.flatMap(h => h.evidence) };
}
