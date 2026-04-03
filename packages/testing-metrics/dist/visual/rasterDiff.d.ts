export interface RasterDiffResult {
    normalizedPixelDiff: number;
    rasterDiffPass: boolean;
    comparisonMode: 'rendered_svg_resvg' | 'rendered_html_inline_svg_resvg' | 'rendered_svg_cairosvg' | 'rendered_html_inline_svg_cairosvg' | 'render_fallback_required' | 'approx_markup_diff';
    warning?: string;
}
export declare function computeApproxMarkupDiff(a: string, b: string): RasterDiffResult;
export declare function computeRenderedRasterDiff(a: string, b: string): RasterDiffResult;
//# sourceMappingURL=rasterDiff.d.ts.map