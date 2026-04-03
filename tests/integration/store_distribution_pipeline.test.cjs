const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { runSmokeStoreDistribution } = require('../../scripts/smoke_store_distribution.cjs');

test('store distribution smoke builds channel manifests and staged payloads', () => {
  const result = runSmokeStoreDistribution();

  assert.equal(typeof result.releaseVersion, 'string');
  assert.equal(typeof result.schemaVersion, 'string');
  assert.equal(result.channelCount >= 3, true);
  assert.equal(fs.existsSync(result.distributionManifestPath), true);
  assert.equal(fs.existsSync(result.uploadQueuePath), true);
});
