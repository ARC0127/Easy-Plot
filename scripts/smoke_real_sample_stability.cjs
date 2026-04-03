const { runRealSampleStabilityReport } = require('./real_sample_stability_report.cjs');

function runSmokeRealSampleStability() {
  const { report, outJsonPath, outMdPath } = runRealSampleStabilityReport();
  return {
    generatedAt: report.generatedAt,
    fixtureCount: report.dataset.fixtureCount,
    overallPass: report.overallPass,
    outJsonPath,
    outMdPath,
  };
}

if (require.main === module) {
  const result = runSmokeRealSampleStability();
  console.log(JSON.stringify(result, null, 2));
  console.log('SMOKE_REAL_SAMPLE_STABILITY_PASS');
  if (!result.overallPass) {
    process.exit(1);
  }
}

module.exports = {
  runSmokeRealSampleStability,
};
