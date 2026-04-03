const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function measureCommand(command, args, cwd) {
  const started = process.hrtime.bigint();
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.status !== 0) {
    throw new Error(
      `Performance baseline command failed: ${command} ${args.join(' ')}\n` +
        `status=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }
  return elapsedMs;
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    count: sorted.length,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    avgMs: sum / sorted.length,
    medianMs: median,
    samplesMs: sorted,
  };
}

function runPerformanceBaselineReport(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const iterations = Number.isInteger(options.iterations) ? options.iterations : 3;
  const writeOutputs = options.writeOutputs !== false;

  const checks = [
    {
      id: 'import_pipeline_latency',
      description: 'Import pipeline smoke latency',
      command: 'node',
      args: ['scripts/smoke_import_pipeline.cjs'],
      maxMedianMs: 2500,
    },
    {
      id: 'editor_pipeline_latency',
      description: 'Editor pipeline smoke latency',
      command: 'node',
      args: ['scripts/smoke_editor_pipeline.cjs'],
      maxMedianMs: 2500,
    },
    {
      id: 'roundtrip_pipeline_latency',
      description: 'Roundtrip pipeline smoke latency',
      command: 'node',
      args: ['scripts/smoke_roundtrip_pipeline.cjs'],
      maxMedianMs: 3500,
    },
  ];

  const measurements = [];
  for (const check of checks) {
    const sampleMs = [];
    for (let i = 0; i < iterations; i += 1) {
      sampleMs.push(measureCommand(check.command, check.args, repoRoot));
    }
    const s = stats(sampleMs);
    measurements.push({
      id: check.id,
      description: check.description,
      threshold: {
        metric: 'medianMs',
        maxAllowed: check.maxMedianMs,
      },
      stats: s,
      pass: s.medianMs <= check.maxMedianMs,
    });
  }

  const overallPass = measurements.every((item) => item.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    iterations,
    overallPass,
    measurements,
  };

  const outJsonPath = path.join(repoRoot, 'docs', 'audit', 'performance_baseline_report.json');

  const mdLines = [
    '# 性能基线报告',
    '',
    '- Status: audit',
    "- Primary Source: `scripts/performance_baseline_report.cjs`, `scripts/smoke_import_pipeline.cjs`, `scripts/smoke_editor_pipeline.cjs`, `scripts/smoke_roundtrip_pipeline.cjs`",
    `- Last Verified: ${report.generatedAt.slice(0, 10)}`,
    '- Verification Mode: smoke rerun',
    '',
    '## 1. 总体结论',
    '',
    `- overallPass: \`${overallPass}\``,
    `- iterations: \`${iterations}\``,
    '',
    '## 2. 指标结果',
    '',
    '| Check | Median (ms) | Threshold (ms) | Pass |',
    '| --- | ---: | ---: | --- |',
    ...measurements.map(
      (item) =>
        `| \`${item.id}\` | ${item.stats.medianMs.toFixed(2)} | ${item.threshold.maxAllowed} | ${item.pass} |`
    ),
    '',
    '## 3. 产物',
    '',
    '- JSON: `docs/audit/performance_baseline_report.json`',
  ];
  const outMdPath = path.join(repoRoot, 'docs', 'audit', 'performance-baseline.md');
  if (writeOutputs) {
    fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
    fs.writeFileSync(outJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(outMdPath, `${mdLines.join('\n')}\n`, 'utf8');
  }

  return {
    report,
    outJsonPath,
    outMdPath,
  };
}

if (require.main === module) {
  const iterationsArg = process.argv.find((arg) => arg.startsWith('--iterations='));
  const iterations = iterationsArg ? Number.parseInt(iterationsArg.split('=')[1], 10) : undefined;
  const { report, outJsonPath, outMdPath } = runPerformanceBaselineReport({
    iterations: Number.isInteger(iterations) ? iterations : undefined,
  });
  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        overallPass: report.overallPass,
        iterations: report.iterations,
        outJsonPath,
        outMdPath,
      },
      null,
      2
    )
  );
  console.log('PERFORMANCE_BASELINE_REPORT_WRITTEN');
  if (!report.overallPass) {
    process.exit(1);
  }
}

module.exports = {
  runPerformanceBaselineReport,
};
