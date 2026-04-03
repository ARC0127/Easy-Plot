const test = require('node:test');
const assert = require('node:assert/strict');

const { computeRenderedRasterDiff } = require('../../packages/testing-metrics/dist/visual/rasterDiff.js');

test('rendered raster diff uses resvg for svg inputs', () => {
  const svg = '<svg width="16" height="16"><rect x="0" y="0" width="16" height="16" fill="#f00"/></svg>';
  const result = computeRenderedRasterDiff(svg, svg);

  assert.equal(result.comparisonMode, 'rendered_svg_resvg');
  assert.equal(result.rasterDiffPass, true);
  assert.equal(result.normalizedPixelDiff, 0);
});

test('rendered raster diff extracts inline svg from html inputs', () => {
  const html = '<html><body><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#0f0"/></svg></body></html>';
  const result = computeRenderedRasterDiff(html, html);

  assert.equal(result.comparisonMode, 'rendered_html_inline_svg_resvg');
  assert.equal(result.rasterDiffPass, true);
  assert.equal(result.normalizedPixelDiff, 0);
});
