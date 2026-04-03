const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildStoreDistribution } = require('./build_store_distribution.cjs');

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runSmokeStoreDistribution(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const summary = buildStoreDistribution({ repoRoot });

  assertExists(summary.distributionManifestPath, 'distribution manifest');
  assertExists(summary.uploadQueuePath, 'upload queue');

  for (const channel of summary.channels) {
    assertExists(channel.manifestPath, `channel manifest (${channel.channelId})`);
    const channelManifest = JSON.parse(fs.readFileSync(channel.manifestPath, 'utf8'));
    if (!Array.isArray(channelManifest.packageFiles) || channelManifest.packageFiles.length === 0) {
      throw new Error(`Channel has no package files: ${channel.channelId}`);
    }
    for (const packageFile of channelManifest.packageFiles) {
      const stagedPath = path.join(repoRoot, packageFile.stagedPath);
      assertExists(stagedPath, `staged package file (${channel.channelId})`);
      const digest = sha256File(stagedPath);
      if (digest !== packageFile.sha256) {
        throw new Error(
          `sha256 mismatch (${channel.channelId}): ${packageFile.stagedPath}, expected=${packageFile.sha256}, actual=${digest}`
        );
      }
    }
  }

  return {
    generatedAt: summary.generatedAt,
    releaseVersion: summary.releaseVersion,
    schemaVersion: summary.schemaVersion,
    distributionManifestPath: summary.distributionManifestPath,
    uploadQueuePath: summary.uploadQueuePath,
    channelCount: summary.channels.length,
  };
}

if (require.main === module) {
  const result = runSmokeStoreDistribution();
  console.log(JSON.stringify(result, null, 2));
  console.log('SMOKE_STORE_DISTRIBUTION_PASS');
}

module.exports = {
  runSmokeStoreDistribution,
};
