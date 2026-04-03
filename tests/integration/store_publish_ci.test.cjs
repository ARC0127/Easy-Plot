const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { runSmokeStorePublishCI } = require('../../scripts/smoke_store_publish_ci.cjs');

test('store publish ci dry-run generates report and passes channel readiness checks', async () => {
  const result = await runSmokeStorePublishCI();

  assert.equal(result.overallPass, true);
  assert.equal(result.mode, 'dry_run');
  assert.equal(result.channelCount >= 3, true);
  assert.equal(fs.existsSync(result.reportPath), true);
  assert.equal(fs.existsSync(result.reportMdPath), true);
});
