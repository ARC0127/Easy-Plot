const test = require('node:test');
const assert = require('node:assert/strict');

const { runFixtureAuthenticityAudit } = require('../../scripts/fixture_authenticity_audit.cjs');

test('fixture authenticity audit passes D8 gate with structural integrity', () => {
  const { report } = runFixtureAuthenticityAudit();

  assert.equal(report.summary.totalFixtures, 52);
  assert.equal(report.verdict.structuralPass, true);
  assert.equal(report.verdict.authenticityPass, true);
  assert.equal(report.verdict.status, 'pass');
  assert.equal(report.summary.syntheticCount, 33);
  assert.equal(report.summary.nonSyntheticCount, 19);
  assert.equal(report.summary.hashMatchRatio, 1);
  assert.equal(report.summary.nonSyntheticRatio >= report.targets.minNonSyntheticRatio, true);
});
