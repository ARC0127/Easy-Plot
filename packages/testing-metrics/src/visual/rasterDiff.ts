import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

function normalizeMarkup(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

export interface RasterDiffResult {
  normalizedPixelDiff: number;
  rasterDiffPass: boolean;
  comparisonMode:
    | 'rendered_svg_resvg'
    | 'rendered_html_inline_svg_resvg'
    | 'rendered_svg_cairosvg'
    | 'rendered_html_inline_svg_cairosvg'
    | 'render_fallback_required'
    | 'approx_markup_diff';
  warning?: string;
}

export function computeApproxMarkupDiff(a: string, b: string): RasterDiffResult {
  const x = normalizeMarkup(a);
  const y = normalizeMarkup(b);
  const maxLen = Math.max(x.length, y.length, 1);
  let mismatch = Math.abs(x.length - y.length);
  const minLen = Math.min(x.length, y.length);
  for (let i = 0; i < minLen; i += 1) {
    if (x[i] !== y[i]) mismatch += 1;
  }
  const normalizedPixelDiff = mismatch / maxLen;
  return {
    normalizedPixelDiff,
    rasterDiffPass: normalizedPixelDiff <= 0.025,
    comparisonMode: 'approx_markup_diff',
  };
}

function detectMarkupKind(markup: string): 'svg' | 'html' {
  const trimmed = markup.trim().toLowerCase();
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
    return trimmed.includes('<html') && !trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml') ? 'html' : 'svg';
  }
  return 'html';
}

function extractInlineSvg(markup: string): string | null {
  const match = markup.match(/<svg\b[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

function ensureSvgNamespaces(svgText: string): string {
  const hasXmlns = /\sxmlns\s*=\s*['"][^'"]+['"]/i.test(svgText);
  const hasXmlnsXlink = /\sxmlns:xlink\s*=\s*['"][^'"]+['"]/i.test(svgText);
  const needsXlinkNs = /xlink:href\s*=/i.test(svgText);

  return svgText.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const additions: string[] = [];
    if (!hasXmlns) additions.push('xmlns="http://www.w3.org/2000/svg"');
    if (needsXlinkNs && !hasXmlnsXlink) additions.push('xmlns:xlink="http://www.w3.org/1999/xlink"');
    const extra = additions.length > 0 ? ` ${additions.join(' ')}` : '';
    return `<svg${attrs}${extra}>`;
  });
}

type RenderMode = 'rendered_svg_resvg' | 'rendered_html_inline_svg_resvg';

interface RenderedImage {
  mode: RenderMode;
  width: number;
  height: number;
  data: Uint8Array;
}

function renderWithResvg(markup: string, kind: 'svg' | 'html'): RenderedImage | null {
  const svgText = extractInlineSvg(markup);
  const source = kind === 'html' ? svgText : svgText ?? markup;
  if (!source) return null;

  const rendered = new Resvg(ensureSvgNamespaces(source)).render().asPng();
  const png = PNG.sync.read(rendered);

  return {
    mode: kind === 'html' ? 'rendered_html_inline_svg_resvg' : 'rendered_svg_resvg',
    width: png.width,
    height: png.height,
    data: png.data,
  };
}

function pixelAt(img: RenderedImage, x: number, y: number): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) {
    return [0, 0, 0, 0];
  }
  const idx = (y * img.width + x) * 4;
  return [img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3]];
}

function normalizedPixelDiff(a: RenderedImage, b: RenderedImage): number {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  let total = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r1, g1, b1, a1] = pixelAt(a, x, y);
      const [r2, g2, b2, a2] = pixelAt(b, x, y);
      if (a1 === 0 && a2 === 0) continue;
      total += (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2)) / (255 * 4);
      count += 1;
    }
  }

  if (count === 0) return 0;
  return total / count;
}

export function computeRenderedRasterDiff(a: string, b: string): RasterDiffResult {
  const kindA = detectMarkupKind(a);
  const kindB = detectMarkupKind(b);

  try {
    const renderedA = renderWithResvg(a, kindA);
    const renderedB = renderWithResvg(b, kindB);
    if (!renderedA || !renderedB) {
      const fallback = computeApproxMarkupDiff(a, b);
      return {
        ...fallback,
        warning: `resvg render unavailable for kinds: ${kindA}, ${kindB}; fell back to approx markup diff`,
      };
    }
    const diff = normalizedPixelDiff(renderedA, renderedB);
    const mode = renderedA.mode === renderedB.mode ? renderedA.mode : 'rendered_svg_resvg';
    return {
      normalizedPixelDiff: diff,
      rasterDiffPass: diff <= 0.025,
      comparisonMode: mode,
      warning: renderedA.mode === renderedB.mode ? undefined : `render mode mismatch: ${renderedA.mode} vs ${renderedB.mode}`,
    };
  } catch (error) {
    const fallback = computeApproxMarkupDiff(a, b);
    return {
      ...fallback,
      warning: `resvg rendered comparison exception; fell back to approx markup diff: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
