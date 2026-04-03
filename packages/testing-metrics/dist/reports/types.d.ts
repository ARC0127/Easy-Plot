export interface VisualEquivalenceReport {
    pass: boolean;
    semanticBBoxPass: boolean;
    rasterDiffPass: boolean;
    normalizedPixelDiff: number;
    comparisonMode: 'rendered_svg_resvg' | 'rendered_html_inline_svg_resvg' | 'rendered_svg_cairosvg' | 'rendered_html_inline_svg_cairosvg' | 'render_fallback_required' | 'approx_markup_diff';
    warning?: string;
    semanticBBoxViolations: Array<{
        objectId: string;
        centerShiftPx: number;
        sizeChangeRatio: number;
    }>;
}
export interface InteractionRetentionReport {
    pass: boolean;
    retainedCount: number;
    originalCount: number;
    retentionRate: number;
    failures: Array<{
        objectId: string;
        expected: string[];
        actual: string[];
    }>;
}
export interface AcceptanceSummary {
    family: string;
    metrics: Record<string, number>;
    pass: boolean;
    failingMetrics: string[];
}
//# sourceMappingURL=types.d.ts.map