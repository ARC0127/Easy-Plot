const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDesktopWorkbench } = require('../../apps/desktop/dist/renderer/index.js');

test('curve groups can be reshaped and exported text keeps multi-font fallback stacks', () => {
  const samplePath = path.resolve(__dirname, '../../artifacts/release_suite/cases/originals/curve_release_case.svg');
  const svg = fs.readFileSync(samplePath, 'utf8');

  const workbench = createDesktopWorkbench();
  workbench.importDocument({
    path: 'artifacts/release_suite/cases/originals/curve_release_case.svg',
    content: svg,
    kind: 'svg',
    familyHint: 'chart_family',
    htmlMode: 'limited',
  });

  const beforeSeries = workbench.state.project.project.objects.curve_series_a;
  const beforeGroup = workbench.selectById('curve_series_a_group').properties;
  const beforeD = String(beforeSeries?.geometry?.attributes?.d ?? '');
  const beforeGroupY = Number(beforeGroup?.bbox?.y ?? 0);

  workbench.adjustSelectedCurve(-24);

  const afterSeries = workbench.state.project.project.objects.curve_series_a;
  const afterGroup = workbench.selectById('curve_series_a_group').properties;
  const afterD = String(afterSeries?.geometry?.attributes?.d ?? '');
  const afterGroupY = Number(afterGroup?.bbox?.y ?? 0);

  assert.notEqual(afterD, beforeD);
  assert.notEqual(afterGroupY, beforeGroupY);

  const preview = workbench.previewSvgContent();
  assert.match(preview, /font-family="[^"]*Aptos[^"]*Segoe UI[^"]*Arial[^"]*DejaVu Sans[^"]*sans-serif"/);

  const matrixPath = path.resolve(__dirname, '../../artifacts/release_suite/cases/originals/matrix_release_case.svg');
  const matrixWorkbench = createDesktopWorkbench();
  matrixWorkbench.importDocument({
    path: 'artifacts/release_suite/cases/originals/matrix_release_case.svg',
    content: fs.readFileSync(matrixPath, 'utf8'),
    kind: 'svg',
    familyHint: 'chart_family',
    htmlMode: 'limited',
  });
  const matrixPreview = matrixWorkbench.previewSvgContent();
  assert.equal(matrixPreview.includes('Georgia'), true);
  assert.equal(matrixPreview.includes('Times New Roman'), true);
  assert.equal(matrixPreview.includes('DejaVu Serif'), true);
  assert.equal(matrixPreview.includes('serif'), true);

  const flowPath = path.resolve(__dirname, '../../artifacts/release_suite/cases/originals/flow_release_case.svg');
  const flowWorkbench = createDesktopWorkbench();
  flowWorkbench.importDocument({
    path: 'artifacts/release_suite/cases/originals/flow_release_case.svg',
    content: fs.readFileSync(flowPath, 'utf8'),
    kind: 'svg',
    familyHint: 'illustration_like',
    htmlMode: 'limited',
  });
  const flowPreview = flowWorkbench.previewSvgContent();
  assert.equal(flowPreview.includes('Cascadia Mono'), true);
  assert.equal(flowPreview.includes('Consolas'), true);
  assert.equal(flowPreview.includes('DejaVu Sans Mono'), true);
  assert.equal(flowPreview.includes('monospace'), true);
});
