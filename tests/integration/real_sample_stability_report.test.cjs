const test = require('node:test');
const assert = require('node:assert/strict');

const { runRealSampleStabilityReport } = require('../../scripts/real_sample_stability_report.cjs');

test('real sample stability report passes thresholds on real/weak_real subset', () => {
  const { report } = runRealSampleStabilityReport({ writeOutputs: false });

  assert.equal(report.dataset.fixtureCount > 0, true);
  assert.equal(report.overallPass, true);
  assert.equal(Array.isArray(report.familySummaries), true);
  assert.equal(report.familySummaries.length >= 4, true);
  assert.equal(report.familySummaries.every((summary) => summary.pass), true);
});
