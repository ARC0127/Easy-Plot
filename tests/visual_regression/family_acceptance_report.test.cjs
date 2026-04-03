const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

test('family acceptance report script emits full family summary', () => {
  const repoRoot = path.join(__dirname, '../..');
  childProcess.execSync('node scripts/family_acceptance_report.cjs', {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const reportPath = path.join(repoRoot, 'docs/audit/family_acceptance_report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  assert.equal(Array.isArray(report.summaries), true);
  assert.equal(report.summaries.length, 6);
  const families = new Set(report.summaries.map((s) => s.family));
  assert.equal(families.has('matplotlib'), true);
  assert.equal(families.has('chart_family'), true);
  assert.equal(families.has('illustration_like'), true);
  assert.equal(families.has('llm_svg'), true);
  assert.equal(families.has('static_html_inline_svg'), true);
  assert.equal(families.has('degraded_svg'), true);
});
