const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildStoreDistribution } = require('./build_store_distribution.cjs');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    requireCredentials: false,
    channels: [],
    reportPath: null,
    endpoint: null,
    token: null,
    timeoutMs: 15000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (item === '--require-credentials') {
      args.requireCredentials = true;
      continue;
    }
    if (item === '--channel') {
      args.channels.push(String(argv[i + 1] ?? ''));
      i += 1;
      continue;
    }
    if (item.startsWith('--channel=')) {
      args.channels.push(item.slice('--channel='.length));
      continue;
    }
    if (item === '--report') {
      args.reportPath = String(argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (item.startsWith('--report=')) {
      args.reportPath = item.slice('--report='.length);
      continue;
    }
    if (item === '--endpoint') {
      args.endpoint = String(argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (item.startsWith('--endpoint=')) {
      args.endpoint = item.slice('--endpoint='.length);
      continue;
    }
    if (item === '--token') {
      args.token = String(argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (item.startsWith('--token=')) {
      args.token = item.slice('--token='.length);
      continue;
    }
    if (item === '--timeout-ms') {
      args.timeoutMs = Number.parseInt(String(argv[i + 1] ?? ''), 10);
      i += 1;
      continue;
    }
    if (item.startsWith('--timeout-ms=')) {
      args.timeoutMs = Number.parseInt(item.slice('--timeout-ms='.length), 10);
      continue;
    }
  }
  return args;
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function publishChannel(endpointBase, token, channelManifest, timeoutMs) {
  const url = `${endpointBase.replace(/\/$/, '')}/publish`;
  const payload = {
    channelId: channelManifest.channelId,
    releaseRing: channelManifest.releaseRing,
    releaseVersion: channelManifest.releaseVersion,
    schemaVersion: channelManifest.schemaVersion,
    generatedAt: channelManifest.generatedAt,
    packageFiles: channelManifest.packageFiles,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Store publish failed for channel=${channelManifest.channelId}, status=${response.status}, body=${responseText}`
    );
  }

  return {
    statusCode: response.status,
    body: responseText,
  };
}

async function runStorePublishCI(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const args = options.args ?? parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const summary = buildStoreDistribution({ repoRoot });
  const distributionManifestPath = summary.distributionManifestPath;
  ensureFile(distributionManifestPath, 'distribution manifest');
  const distributionManifest = JSON.parse(fs.readFileSync(distributionManifestPath, 'utf8'));

  const selectedChannels = (args.channels ?? []).filter(Boolean);
  const channels = distributionManifest.channels.filter((channel) =>
    selectedChannels.length === 0 ? true : selectedChannels.includes(channel.channelId)
  );
  if (channels.length === 0) {
    throw new Error('No channels selected for store publish.');
  }

  const endpoint = (args.endpoint || process.env.STORE_PUBLISH_ENDPOINT || '').trim();
  const token = (args.token || process.env.STORE_PUBLISH_TOKEN || '').trim();
  const dryRun = Boolean(args.dryRun);
  const requireCredentials = Boolean(args.requireCredentials);
  const timeoutMs = Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 15000;

  if (requireCredentials && (!endpoint || !token)) {
    throw new Error('Missing STORE_PUBLISH_ENDPOINT / STORE_PUBLISH_TOKEN for credentialed publish mode.');
  }

  const channelReports = [];
  for (const channel of channels) {
    const manifestPath = path.join(repoRoot, channel.manifestPath);
    ensureFile(manifestPath, `channel manifest (${channel.channelId})`);
    const channelManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const pkg of channelManifest.packageFiles) {
      const stagedPath = path.join(repoRoot, pkg.stagedPath);
      ensureFile(stagedPath, `staged payload file (${channel.channelId})`);
      const digest = sha256File(stagedPath);
      if (digest !== pkg.sha256) {
        throw new Error(
          `Payload hash mismatch for channel=${channel.channelId}, file=${pkg.stagedPath}, expected=${pkg.sha256}, actual=${digest}`
        );
      }
    }

    if (dryRun || !endpoint || !token) {
      const requestDigest = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            channelId: channelManifest.channelId,
            releaseVersion: channelManifest.releaseVersion,
            schemaVersion: channelManifest.schemaVersion,
            packageFiles: channelManifest.packageFiles,
          })
        )
        .digest('hex');
      channelReports.push({
        channelId: channel.channelId,
        mode: dryRun ? 'dry_run' : 'credential_placeholder',
        publishStatus: 'ready',
        requestDigest,
      });
      continue;
    }

    const publishResponse = await publishChannel(endpoint, token, channelManifest, timeoutMs);
    channelReports.push({
      channelId: channel.channelId,
      mode: 'credentialed_publish',
      publishStatus: 'uploaded',
      response: publishResponse,
    });
  }

  const overallPass = channelReports.every((item) => item.publishStatus === 'ready' || item.publishStatus === 'uploaded');
  const report = {
    generatedAt,
    mode: dryRun ? 'dry_run' : endpoint && token ? 'credentialed_publish' : 'credential_placeholder',
    requireCredentials,
    credentialsProvided: Boolean(endpoint && token),
    endpointConfigured: Boolean(endpoint),
    channelCount: channelReports.length,
    releaseVersion: distributionManifest.releaseVersion,
    schemaVersion: distributionManifest.schemaVersion,
    overallPass,
    channelReports,
  };

  const reportPath =
    args.reportPath ?? path.join(repoRoot, 'docs', 'audit', 'store_publish_ci_report.json');
  const reportMdPath = path.join(repoRoot, 'docs', 'audit', 'store-publish-ci.md');
  writeJson(reportPath, report);
  fs.writeFileSync(
    reportMdPath,
    [
      '# Store 发布 CI 报告',
      '',
      '- Status: audit',
      "- Primary Source: `scripts/publish_store_distribution.cjs`, `artifacts/distribution/*`, CI workflow",
      `- Last Verified: ${generatedAt.slice(0, 10)}`,
      '- Verification Mode: smoke rerun',
      '',
      '## 1. 总体结论',
      '',
      `- mode: \`${report.mode}\``,
      `- channelCount: \`${report.channelCount}\``,
      `- overallPass: \`${report.overallPass}\``,
      `- credentialsProvided: \`${report.credentialsProvided}\``,
      '',
      '## 2. 通道结果',
      '',
      '| Channel | Mode | Status |',
      '| --- | --- | --- |',
      ...channelReports.map(
        (item) => `| \`${item.channelId}\` | \`${item.mode}\` | \`${item.publishStatus}\` |`
      ),
      '',
      '## 3. 产物',
      '',
      '- JSON: `docs/audit/store_publish_ci_report.json`',
      '- Markdown: `docs/audit/store-publish-ci.md`',
    ].join('\n') + '\n',
    'utf8'
  );

  return {
    report,
    reportPath,
    reportMdPath,
  };
}

if (require.main === module) {
  runStorePublishCI()
    .then(({ report, reportPath, reportMdPath }) => {
      console.log(
        JSON.stringify(
          {
            generatedAt: report.generatedAt,
            mode: report.mode,
            channelCount: report.channelCount,
            overallPass: report.overallPass,
            reportPath,
            reportMdPath,
          },
          null,
          2
        )
      );
      console.log('STORE_PUBLISH_CI_REPORT_WRITTEN');
      if (!report.overallPass) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}

module.exports = {
  runStorePublishCI,
};
