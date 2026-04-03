const path = require('node:path');

const { runStorePublishCI } = require('./publish_store_distribution.cjs');

async function runSmokeStorePublishCI(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const { report, reportPath, reportMdPath } = await runStorePublishCI({
    repoRoot,
    args: {
      dryRun: true,
      requireCredentials: false,
      channels: [],
      reportPath: null,
      endpoint: null,
      token: null,
      timeoutMs: 15000,
    },
  });

  return {
    generatedAt: report.generatedAt,
    mode: report.mode,
    channelCount: report.channelCount,
    overallPass: report.overallPass,
    reportPath,
    reportMdPath,
  };
}

if (require.main === module) {
  runSmokeStorePublishCI()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      console.log('SMOKE_STORE_PUBLISH_CI_PASS');
      if (!result.overallPass) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}

module.exports = {
  runSmokeStorePublishCI,
};
