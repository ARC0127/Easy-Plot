const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PNG } = require('pngjs');

const { runBuildReleaseShowcaseSuite } = require('../../scripts/build_release_showcase_suite.cjs');

test('release showcase suite builds three complete cases and a comparison montage', () => {
  const summary = runBuildReleaseShowcaseSuite();

  assert.equal(Array.isArray(summary.cases), true);
  assert.equal(summary.cases.length, 3);

  for (const caseSummary of summary.cases) {
    assert.equal(fs.existsSync(caseSummary.originalPath), true);
    assert.equal(fs.existsSync(caseSummary.outputs.project), true);
    assert.equal(fs.existsSync(caseSummary.outputs.svg), true);
    assert.equal(fs.existsSync(caseSummary.outputs.html), true);
    assert.equal(fs.existsSync(caseSummary.outputs.png), true);
    assert.equal(fs.existsSync(caseSummary.outputs.summary), true);
    assert.equal(caseSummary.operations.includes('import'), true);
    assert.equal(caseSummary.operations.includes('save_project'), true);
    assert.equal(caseSummary.operations.includes('load_project'), true);
    assert.equal(caseSummary.operations.includes('export_svg'), true);
    assert.equal(caseSummary.operations.includes('export_html'), true);
    assert.equal(caseSummary.operations.includes('export_png'), true);

    const adjustedSvg = fs.readFileSync(caseSummary.outputs.svg, 'utf8');
    assert.equal(adjustedSvg.includes('<svg'), true);
    assert.equal(adjustedSvg.length > 1000, true);

    if (caseSummary.caseId === 'curve_release_case') {
      assert.equal(caseSummary.operations.includes('adjust_curve_series_a'), true);
      assert.equal(caseSummary.operations.includes('adjust_curve_series_b'), true);
      assert.match(adjustedSvg, /curve_series_a/);
      assert.match(adjustedSvg, /font-family="[^"]*Aptos[^"]*Segoe UI[^"]*Arial/);
    }
  }

  assert.equal(fs.existsSync(summary.montagePath), true);
  const montage = PNG.sync.read(fs.readFileSync(summary.montagePath));
  assert.ok(montage.width > 1000);
  assert.ok(montage.height > 500);
});
