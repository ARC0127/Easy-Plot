const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildReleaseAssets } = require('./build_release_assets.cjs');

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function copyFileWithHash(repoRoot, srcRelativePath, dstPath) {
  const srcPath = path.resolve(repoRoot, srcRelativePath);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source artifact not found: ${srcPath}`);
  }
  mkdirp(path.dirname(dstPath));
  fs.copyFileSync(srcPath, dstPath);
  const digest = crypto.createHash('sha256').update(fs.readFileSync(dstPath)).digest('hex');
  return {
    srcPath,
    dstPath,
    sha256: digest,
    bytes: fs.statSync(dstPath).size,
  };
}

function buildStoreDistribution(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const generatedAt = new Date().toISOString();

  const releaseSummary = buildReleaseAssets({ repoRoot });
  const versionManifestPath = releaseSummary.versionManifestPath;
  const versionManifest = JSON.parse(fs.readFileSync(versionManifestPath, 'utf8'));

  const distributionRoot = path.join(repoRoot, 'artifacts', 'distribution');
  const channelsRoot = path.join(distributionRoot, 'channels');
  mkdirp(channelsRoot);

  const channelSpecs = [
    {
      channelId: 'stable_linux_x64',
      label: 'Stable Linux x64',
      releaseRing: 'stable',
      artifacts: [
        versionManifest.artifacts.installer.archivePath,
        versionManifest.artifacts.releaseNotes,
        versionManifest.artifacts.versionedSchema,
        versionManifest.artifacts.supportedFamilies,
        versionManifest.artifacts.knownLimitations,
      ],
    },
    {
      channelId: 'canary_linux_x64',
      label: 'Canary Linux x64',
      releaseRing: 'canary',
      artifacts: [
        versionManifest.artifacts.installer.archivePath,
        versionManifest.artifacts.releaseBundle.indexHtmlPath,
        versionManifest.artifacts.releaseBundle.manifestPath,
        versionManifest.artifacts.releaseNotes,
        versionManifest.artifacts.performanceBaselineReport,
      ],
    },
    {
      channelId: 'web_bundle_preview',
      label: 'Web Bundle Preview',
      releaseRing: 'preview',
      artifacts: [
        versionManifest.artifacts.releaseBundle.indexHtmlPath,
        versionManifest.artifacts.releaseBundle.manifestPath,
        versionManifest.artifacts.releaseNotes,
        versionManifest.artifacts.fixtureAuthenticityReport,
        versionManifest.artifacts.acceptanceReport,
      ],
    },
  ];

  const channelResults = channelSpecs.map((channel) => {
    const channelDir = path.join(channelsRoot, channel.channelId);
    const payloadDir = path.join(channelDir, 'payload');
    mkdirp(payloadDir);

    const packageFiles = channel.artifacts.map((relativePath) =>
      copyFileWithHash(repoRoot, relativePath, path.join(payloadDir, relativePath.replace(/\//g, '__')))
    );

    const channelManifest = {
      manifestVersion: '1.0.0',
      generatedAt,
      channelId: channel.channelId,
      label: channel.label,
      releaseRing: channel.releaseRing,
      sourceVersionManifest: path.relative(repoRoot, versionManifestPath).replace(/\\/g, '/'),
      releaseVersion: versionManifest.releaseVersion,
      schemaVersion: versionManifest.schemaVersion,
      packageFiles: packageFiles.map((entry) => ({
        originalPath: path.relative(repoRoot, entry.srcPath).replace(/\\/g, '/'),
        stagedPath: path.relative(repoRoot, entry.dstPath).replace(/\\/g, '/'),
        sha256: entry.sha256,
        bytes: entry.bytes,
      })),
      checks: {
        hasReleaseNotes: packageFiles.some((entry) => entry.srcPath.endsWith('release_notes.md')),
        hasVersionedSchema: packageFiles.some((entry) => entry.srcPath.includes('/versioned_schema/')),
      },
    };

    const manifestPath = path.join(channelDir, 'channel-manifest.json');
    writeJson(manifestPath, channelManifest);

    return {
      channelId: channel.channelId,
      label: channel.label,
      releaseRing: channel.releaseRing,
      channelDir,
      manifestPath,
      packageFiles: channelManifest.packageFiles,
    };
  });

  const uploadQueue = channelResults.map((channel, index) => ({
    order: index + 1,
    channelId: channel.channelId,
    manifestPath: path.relative(repoRoot, channel.manifestPath).replace(/\\/g, '/'),
    status: 'ready_for_upload',
    uploader: 'release-automation-dry-run',
  }));
  const uploadQueuePath = path.join(distributionRoot, 'upload-queue.json');
  writeJson(uploadQueuePath, uploadQueue);

  const distributionManifest = {
    manifestVersion: '1.0.0',
    generatedAt,
    releaseVersion: versionManifest.releaseVersion,
    schemaVersion: versionManifest.schemaVersion,
    sourceVersionManifest: path.relative(repoRoot, versionManifestPath).replace(/\\/g, '/'),
    channels: channelResults.map((channel) => ({
      channelId: channel.channelId,
      label: channel.label,
      releaseRing: channel.releaseRing,
      manifestPath: path.relative(repoRoot, channel.manifestPath).replace(/\\/g, '/'),
      packageCount: channel.packageFiles.length,
    })),
    uploadQueuePath: path.relative(repoRoot, uploadQueuePath).replace(/\\/g, '/'),
    distributionMode: 'store_grade_staging_automation',
  };
  const distributionManifestPath = path.join(distributionRoot, 'distribution-manifest.json');
  writeJson(distributionManifestPath, distributionManifest);

  return {
    generatedAt,
    releaseVersion: versionManifest.releaseVersion,
    schemaVersion: versionManifest.schemaVersion,
    distributionManifestPath,
    uploadQueuePath,
    channels: channelResults,
  };
}

if (require.main === module) {
  const summary = buildStoreDistribution();
  console.log(
    JSON.stringify(
      {
        generatedAt: summary.generatedAt,
        releaseVersion: summary.releaseVersion,
        schemaVersion: summary.schemaVersion,
        distributionManifestPath: summary.distributionManifestPath,
        uploadQueuePath: summary.uploadQueuePath,
        channels: summary.channels.map((channel) => ({
          channelId: channel.channelId,
          manifestPath: channel.manifestPath,
          packageCount: channel.packageFiles.length,
        })),
      },
      null,
      2
    )
  );
  console.log('STORE_DISTRIBUTION_BUILT');
}

module.exports = {
  buildStoreDistribution,
};
