const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../../packages/core-normalizer/dist/index.js');
const { createDesktopWorkbench } = require('../../apps/desktop/dist/renderer/index.js');

const markerUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 220 140" width="220" height="140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g id="axes_1">
    <defs>
      <path id="m123abc" d="M 0 2.5 C 1.3807 2.5 2.5 1.3807 2.5 0 C 2.5 -1.3807 1.3807 -2.5 0 -2.5 C -1.3807 -2.5 -2.5 -1.3807 -2.5 0 C -2.5 1.3807 -1.3807 2.5 0 2.5 z" />
    </defs>
    <g id="PathCollection_1">
      <use xlink:href="#m123abc" x="40" y="40" style="fill: #5d7087; fill-opacity: 0.46" />
      <use xlink:href="#m123abc" x="92" y="74" style="fill: #2a9d8f; fill-opacity: 0.76" />
    </g>
    <rect x="140" y="24" width="50" height="80" fill="#dbeafe" />
  </g>
</svg>`;

function buildLargeMarkerSvg(markerCount = 1200) {
  const uses = [];
  for (let i = 0; i < markerCount; i += 1) {
    const x = 12 + (i % 40) * 6;
    const y = 12 + Math.floor(i / 40) * 6;
    uses.push(`<use xlink:href="#mfeedbeef" x="${x}" y="${y}" style="fill: #5d7087; fill-opacity: 0.46" />`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 220" width="320" height="220" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g id="axes_1">
    <defs>
      <path id="mfeedbeef" d="M 0 1.6 C 0.88 1.6 1.6 0.88 1.6 0 C 1.6 -0.88 0.88 -1.6 0 -1.6 C -0.88 -1.6 -1.6 -0.88 -1.6 0 C -1.6 0.88 -0.88 1.6 0 1.6 z" />
    </defs>
    <g id="PathCollection_big">
      ${uses.join('\n      ')}
    </g>
  </g>
</svg>`;
}

test('marker-style use nodes keep defs/use roundtrip and remain movable', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'marker_use.svg',
    content: markerUseSvg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  const selected = workbench.selectAtPoint(40, 40);
  assert.equal(selected.properties?.objectType, 'shape_node');

  const previewBefore = workbench.previewSvgContent();
  assert.match(previewBefore, /<defs>[\s\S]*id="m123abc"/);
  assert.match(previewBefore, /<use\b[^>]*xlink:href="#m123abc"/);

  workbench.moveSelected(5, 3);
  const previewAfter = workbench.previewSvgContent();
  assert.match(previewAfter, /<use\b[^>]*xlink:href="#m123abc"/);
  assert.match(previewAfter, /transform="translate\(5 3\)"/);
});

test('small icon-like shapes remain selectable a few pixels off target', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'tiny_icon.svg',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 120 80" width="120" height="80" xmlns="http://www.w3.org/2000/svg">
  <path d="M60 40 h3 v3 h-3 z" fill="#0f172a" />
</svg>`,
    kind: 'svg',
    familyHint: 'illustration_like',
    htmlMode: 'limited',
  });

  const selected = workbench.selectAtPoint(68, 41.5);
  assert.equal(selected.properties?.objectType, 'shape_node');
});

test('parser and normalizer do not retain redundant raw SVG copies for large marker imports', () => {
  const svg = buildLargeMarkerSvg();
  const parsed = parseDocument({
    path: 'marker_large.svg',
    content: svg,
  });
  assert.equal(parsed.originalText, undefined);

  const normalized = normalizeDocument(parsed);
  assert.equal(normalized.original, undefined);

  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'marker_large.svg',
    content: svg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  const preview = workbench.previewSvgContent();
  const useCount = (preview.match(/<use\b/g) ?? []).length;
  assert.equal(useCount >= 1200, true);
  assert.match(preview, /id="mfeedbeef"/);
});
