const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { runSmokeReleaseAssets } = require('../../scripts/smoke_release_assets.cjs');
const { runPerformanceBaselineReport } = require('../../scripts/performance_baseline_report.cjs');

test('release assets smoke builds required Section 16 artifacts', () => {
  const result = runSmokeReleaseAssets();
  assert.equal(typeof result.releaseVersion, 'string');
  assert.equal(typeof result.schemaVersion, 'string');
  assert.equal(fs.existsSync(result.releaseNotesArtifactPath), true);
  assert.equal(fs.existsSync(result.versionManifestPath), true);
  assert.equal(fs.existsSync(result.installerArchivePath), true);
});

test('performance baseline report is generated and passes thresholds', () => {
  const { report } = runPerformanceBaselineReport({ iterations: 1, writeOutputs: false });
  assert.equal(report.overallPass, true);
  assert.equal(Array.isArray(report.measurements), true);
  assert.equal(report.measurements.length, 3);
  assert.equal(report.measurements.every((item) => item.pass), true);
});
