const test = require('node:test');
const assert = require('node:assert/strict');

const { createDesktopWorkbench } = require('../../apps/desktop/dist/renderer/index.js');

const glyphSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <path id="DejaVuSans-32" d="M0 0 L8 0 L8 12 L0 12 Z" />
    <path id="DejaVuSans-2e" d="M0 0 L4 0 L4 4 L0 4 Z" />
    <path id="DejaVuSans-35" d="M0 0 L8 0 L8 12 L0 12 Z" />
  </defs>
  <g id="axes_1">
    <g id="text_1">
      <g transform="translate(120 48)">
        <use xlink:href="#DejaVuSans-32" />
        <use xlink:href="#DejaVuSans-2e" x="10" />
        <use xlink:href="#DejaVuSans-35" x="18" />
      </g>
    </g>
    <rect x="20" y="80" width="100" height="40" fill="#dbeafe" />
  </g>
</svg>`;

const rotatedGlyphSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 240 180" width="240" height="180" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <path id="g41" d="M0 0 L8 0 L8 12 L0 12 Z" />
  </defs>
  <g id="axes_1">
    <g id="text_1">
      <g transform="translate(20 140) rotate(-90)">
        <use xlink:href="#g41" />
        <use xlink:href="#g41" x="10" />
        <use xlink:href="#g41" x="20" />
      </g>
    </g>
    <rect x="60" y="40" width="80" height="90" fill="#dbeafe" />
  </g>
</svg>`;

test('glyph/use text clusters lift into selectable text proxies while preserving glyph vector export', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'glyph_proxy.svg',
    content: glyphSvg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  const objectTree = workbench.snapshot().objectTree;
  assert.equal(objectTree.length > 0, true);

  const preview = workbench.previewSvgContent();
  assert.equal(preview.includes('DejaVuSans-32'), true);
  assert.equal(/<use\b/i.test(preview), true);
  assert.equal(preview.includes('font-family="glyph_proxy"'), false);

  const selected = workbench.selectAtPoint(121, 49);
  assert.equal(selected.properties?.objectType, 'text_node');
  assert.equal(selected.properties?.extra?.content, '2.5');
  assert.equal(selected.properties?.capabilities?.includes('text_edit'), false);
});

test('editing a glyph proxy promotes it into editable raw text', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'glyph_proxy_edit.svg',
    content: glyphSvg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  workbench.selectAtPoint(121, 49);
  const edited = workbench.editSelectedText('9.8');

  assert.equal(edited.properties?.objectType, 'text_node');
  assert.equal(edited.properties?.extra?.content, '9.8');
  assert.equal(edited.properties?.capabilities?.includes('text_edit'), true);

  const preview = workbench.previewSvgContent();
  assert.equal(preview.includes('>9.8<'), true);
  assert.equal(preview.includes('DejaVuSans-32'), false);
});

test('moving group containers propagates to descendants and changes visible export positions', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'group_move.svg',
    content: `<svg viewBox="0 0 240 120" width="240" height="120" xmlns="http://www.w3.org/2000/svg">
  <g id="axes_1">
    <text id="text_title" x="20" y="24">Move Me</text>
    <rect x="20" y="40" width="90" height="48" fill="#dbeafe" />
  </g>
</svg>`,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  workbench.selectById('obj_n1');
  workbench.moveSelected(10, 5);

  const preview = workbench.previewSvgContent();
  assert.equal(preview.includes('x="30" y="29"'), true);
  assert.equal(preview.includes('transform="translate(10 5)"'), true);
});

test('rotated glyph proxies keep reasonable font sizing and do not block bar selection', () => {
  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'rotated_glyph_proxy.svg',
    content: rotatedGlyphSvg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  const preview = workbench.previewSvgContent();
  assert.equal(preview.includes('rotate(-90'), true);
  assert.equal(/<use\b/i.test(preview), true);
  assert.equal(preview.includes('font-family="glyph_proxy"'), false);

  const barSelection = workbench.selectAtPoint(80, 70);
  assert.equal(barSelection.properties?.objectType, 'shape_node');

  workbench.moveSelected(10, 0);
  const movedPreview = workbench.previewSvgContent();
  assert.equal(movedPreview.includes('transform="translate(10 0)"'), true);
});
