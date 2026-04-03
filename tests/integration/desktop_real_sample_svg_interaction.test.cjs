const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDesktopWorkbench } = require('../../apps/desktop/dist/renderer/index.js');

test('real sample svg keeps glyph proxy labels compact while leaving plot shapes selectable', () => {
  const samplePath = path.resolve(__dirname, '../../fixtures/matplotlib/mpl_real_interaction.svg');
  const svg = fs.readFileSync(samplePath, 'utf8');

  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'fixtures/matplotlib/mpl_real_interaction.svg',
    content: svg,
    kind: 'svg',
    familyHint: 'matplotlib',
    htmlMode: 'limited',
  });

  const objects = Object.values(workbench.state.project.project.objects);
  const textNodes = objects.filter((object) => object.objectType === 'text_node');
  assert.equal(textNodes.length > 0, true);
  assert.equal(textNodes.every((object) => Number(object.font.size) < 20), true);

  const previewBefore = workbench.previewSvgContent();
  assert.equal(previewBefore.includes('font-size="48"'), false);
  assert.equal(/<use\b/i.test(previewBefore), true);
  assert.equal(previewBefore.includes('font-family="glyph_proxy"'), false);

  const bottomBlank = workbench.selectAtPoint(290, 350);
  assert.equal(bottomBlank.properties, null);

  const legendSelection = workbench.selectAtPoint(130, 345);
  assert.equal(legendSelection.properties?.objectType, 'text_node');
  assert.equal(legendSelection.properties?.extra?.content, 'higher');

  const shapeSelection = workbench.selectAtPoint(350, 150);
  assert.equal(shapeSelection.properties?.objectType, 'shape_node');

  const beforeX = shapeSelection.properties?.bbox?.x ?? 0;
  const moved = workbench.moveSelected(12, 0);
  assert.equal(moved.properties?.objectType, 'shape_node');
  assert.equal(moved.properties?.bbox?.x, beforeX + 12);

  const previewAfter = workbench.previewSvgContent();
  assert.equal(previewAfter.includes('translate(12 0)'), true);
});
