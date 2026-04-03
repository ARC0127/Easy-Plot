const fs = require('node:fs');
const path = require('node:path');

const { buildReleaseAssets } = require('./build_release_assets.cjs');

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function runSmokeReleaseAssets(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const summary = buildReleaseAssets({ repoRoot });

  assertExists(summary.releaseNotesArtifactPath, 'release notes');
  assertExists(summary.versionManifestPath, 'version manifest');
  assertExists(summary.installerArchivePath, 'installer archive');
  assertExists(summary.releaseBundle.indexHtmlPath, 'release bundle index.html');
  assertExists(summary.releaseBundle.manifestPath, 'release bundle manifest');
  assertExists(summary.versionedSchemaPath, 'versioned schema');

  const manifest = JSON.parse(fs.readFileSync(summary.versionManifestPath, 'utf8'));
  if (manifest.schemaVersion !== summary.schemaVersion) {
    throw new Error(
      `schemaVersion mismatch: manifest=${manifest.schemaVersion}, expected=${summary.schemaVersion}`
    );
  }

  return {
    generatedAt: summary.generatedAt,
    releaseVersion: summary.releaseVersion,
    schemaVersion: summary.schemaVersion,
    installerArchivePath: summary.installerArchivePath,
    releaseNotesArtifactPath: summary.releaseNotesArtifactPath,
    versionManifestPath: summary.versionManifestPath,
    supportedFamiliesAsset: summary.supportedFamiliesPath,
    unsupportedCasesAsset: summary.unsupportedCasesPath,
    knownLimitationsAsset: summary.knownLimitationsPath,
  };
}

if (require.main === module) {
  const result = runSmokeReleaseAssets();
  console.log(JSON.stringify(result, null, 2));
  console.log('SMOKE_RELEASE_ASSETS_PASS');
}

module.exports = {
  runSmokeReleaseAssets,
};
