const fs = require('node:fs');
const path = require('node:path');

const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { noOpRoundTrip } = require('../packages/testing-metrics/dist/index.js');
const { loadFixtureRegistry } = require('../packages/testing-fixtures/dist/index.js');

const TARGETS = {
  minVisualPassRate: 0.95,
  minRetentionPassRate: 0.95,
  maxP95NormalizedPixelDiff: 0.025,
  minP05RetentionRate: 0.90,
  maxP95RoundtripMs: 5000,
};

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function percentile(values, q) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
}

function stats(values) {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      p95: 0,
      p05: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p05: percentile(sorted, 0.05),
  };
}

function parseCsv(filePath) {
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(',');
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const record = {};
    for (let i = 0; i < header.length; i += 1) {
      record[header[i]] = cells[i] ?? '';
    }
    rows.push(record);
  }
  return rows;
}

function loadFixtureContent(repoRoot, record) {
  const ext = record.kind === 'html' ? '.html' : '.svg';
  const localPath = path.join(repoRoot, 'packages', 'testing-fixtures', 'data', record.family, `${record.fixtureId}${ext}`);
  return fs.readFileSync(localPath, 'utf8');
}

function importFixture(repoRoot, record) {
  const content = loadFixtureContent(repoRoot, record);
  const ext = record.kind === 'html' ? '.html' : '.svg';
  const sourcePath = `/real_samples/${record.family}/${record.fixtureId}${ext}`;
  const source = {
    sourceId: `real_sample_${record.fixtureId}`,
    kind: record.kind,
    path: sourcePath,
    sha256: 'real_sample_generated',
    familyHint: record.family,
    importedAt: new Date().toISOString(),
  };

  const importStarted = nowMs();
  const parsed = parseDocument({ path: sourcePath, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const cap = assignCapabilities(lifted.project);
  const importMs = nowMs() - importStarted;

  const roundtripStarted = nowMs();
  const roundtrip = noOpRoundTrip(cap.project, source);
  const roundtripMs = nowMs() - roundtripStarted;

  return {
    fixtureId: record.fixtureId,
    family: record.family,
    kind: record.kind,
    importMs,
    roundtripMs,
    objectCount: Object.keys(cap.project.project.objects).length,
    visualPass: roundtrip.visual.pass,
    retentionPass: roundtrip.retention.pass,
    normalizedPixelDiff: roundtrip.visual.normalizedPixelDiff,
    comparisonMode: roundtrip.visual.comparisonMode,
    retentionRate: roundtrip.retention.retentionRate,
    warningCount: roundtrip.degradedObjectWarnings.length + roundtrip.reimport.warnings.length,
    warnings: [...roundtrip.degradedObjectWarnings, ...roundtrip.reimport.warnings],
  };
}

function buildFamilySummary(family, records) {
  const visualPassRate = records.length === 0 ? 0 : records.filter((item) => item.visualPass).length / records.length;
  const retentionPassRate = records.length === 0 ? 0 : records.filter((item) => item.retentionPass).length / records.length;
  const diffStats = stats(records.map((item) => item.normalizedPixelDiff));
  const retentionStats = stats(records.map((item) => item.retentionRate));
  const importLatencyStats = stats(records.map((item) => item.importMs));
  const roundtripLatencyStats = stats(records.map((item) => item.roundtripMs));
  const comparisonModeCounts = Object.fromEntries(
    records.reduce((acc, item) => {
      acc.set(item.comparisonMode, (acc.get(item.comparisonMode) ?? 0) + 1);
      return acc;
    }, new Map())
  );

  const pass =
    visualPassRate >= TARGETS.minVisualPassRate &&
    retentionPassRate >= TARGETS.minRetentionPassRate &&
    diffStats.p95 <= TARGETS.maxP95NormalizedPixelDiff &&
    retentionStats.p05 >= TARGETS.minP05RetentionRate &&
    roundtripLatencyStats.p95 <= TARGETS.maxP95RoundtripMs;

  return {
    family,
    fixtureCount: records.length,
    visualPassRate,
    retentionPassRate,
    normalizedPixelDiff: diffStats,
    retentionRate: retentionStats,
    importLatencyMs: importLatencyStats,
    roundtripLatencyMs: roundtripLatencyStats,
    comparisonModeCounts,
    pass,
  };
}

function runRealSampleStabilityReport(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const writeOutputs = options.writeOutputs !== false;
  const generatedAt = new Date().toISOString();

  const provenanceRows = parseCsv(path.join(repoRoot, 'fixtures', 'fixture_provenance_matrix.csv'));
  const provenanceByFixtureId = new Map(provenanceRows.map((row) => [row.fixture_id, row]));
  const allowedTiers = new Set(['real', 'weak_real']);

  const selectedFixtures = loadFixtureRegistry().filter((record) => {
    const provenance = provenanceByFixtureId.get(record.fixtureId);
    return provenance && allowedTiers.has(provenance.authenticity_tier);
  });

  if (selectedFixtures.length === 0) {
    throw new Error('No real/weak_real fixtures found for stability report.');
  }

  const fixtureReports = selectedFixtures.map((record) => {
    const provenance = provenanceByFixtureId.get(record.fixtureId);
    return {
      ...importFixture(repoRoot, record),
      authenticityTier: provenance.authenticity_tier,
      originClass: provenance.origin_class,
      provenanceRef: provenance.source_reference,
    };
  });

  const familySummaries = [];
  const familyMap = new Map();
  for (const row of fixtureReports) {
    const list = familyMap.get(row.family) ?? [];
    list.push(row);
    familyMap.set(row.family, list);
  }
  for (const [family, rows] of familyMap.entries()) {
    familySummaries.push(buildFamilySummary(family, rows));
  }
  familySummaries.sort((a, b) => a.family.localeCompare(b.family));

  const overall = buildFamilySummary('overall', fixtureReports);
  const overallPass = overall.pass && familySummaries.every((summary) => summary.pass);

  const topRiskByPixelDiff = [...fixtureReports]
    .sort((a, b) => b.normalizedPixelDiff - a.normalizedPixelDiff)
    .slice(0, 5)
    .map((item) => ({
      fixtureId: item.fixtureId,
      family: item.family,
      normalizedPixelDiff: item.normalizedPixelDiff,
      retentionRate: item.retentionRate,
      comparisonMode: item.comparisonMode,
    }));

  const report = {
    generatedAt,
    dataset: {
      fixtureCount: selectedFixtures.length,
      tiers: ['real', 'weak_real'],
      provenanceMatrix: 'fixtures/fixture_provenance_matrix.csv',
    },
    targets: TARGETS,
    overallPass,
    overall,
    familySummaries,
    topRiskByPixelDiff,
    fixtureReports,
  };

  const outJsonPath = path.join(repoRoot, 'docs', 'audit', 'real_sample_stability_report.json');
  const outMdPath = path.join(repoRoot, 'docs', 'audit', 'real-sample-stability.md');

  const mdLines = [
    '# 复杂真实样例稳定性报告',
    '',
    '- Status: audit',
    "- Primary Source: `scripts/real_sample_stability_report.cjs`, `fixtures/fixture_provenance_matrix.csv`, `packages/testing-fixtures/data/*`",
    `- Last Verified: ${generatedAt.slice(0, 10)}`,
    '- Verification Mode: smoke rerun',
    '',
    '## 1. 数据集范围',
    '',
    `- fixture count: \`${report.dataset.fixtureCount}\``,
    '- tiers: `real + weak_real`',
    '',
    '## 2. 总体结论',
    '',
    `- overallPass: \`${overallPass}\``,
    `- overall visualPassRate: \`${overall.visualPassRate.toFixed(4)}\``,
    `- overall retentionPassRate: \`${overall.retentionPassRate.toFixed(4)}\``,
    `- overall p95 normalizedPixelDiff: \`${overall.normalizedPixelDiff.p95.toFixed(6)}\``,
    `- overall p05 retentionRate: \`${overall.retentionRate.p05.toFixed(6)}\``,
    '',
    '## 3. family 汇总',
    '',
    '| Family | Count | visualPassRate | retentionPassRate | p95 pixelDiff | p05 retention | Pass |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...familySummaries.map(
      (summary) =>
        `| \`${summary.family}\` | ${summary.fixtureCount} | ${summary.visualPassRate.toFixed(4)} | ${summary.retentionPassRate.toFixed(4)} | ${summary.normalizedPixelDiff.p95.toFixed(6)} | ${summary.retentionRate.p05.toFixed(6)} | ${summary.pass} |`
    ),
    '',
    '## 4. 高风险样例（按 pixelDiff）',
    '',
    '| Fixture | Family | normalizedPixelDiff | retentionRate | mode |',
    '| --- | --- | ---: | ---: | --- |',
    ...topRiskByPixelDiff.map(
      (item) =>
        `| \`${item.fixtureId}\` | \`${item.family}\` | ${item.normalizedPixelDiff.toFixed(6)} | ${item.retentionRate.toFixed(6)} | \`${item.comparisonMode}\` |`
    ),
    '',
    '## 5. 产物',
    '',
    '- JSON: `docs/audit/real_sample_stability_report.json`',
  ];

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
  const { report, outJsonPath, outMdPath } = runRealSampleStabilityReport();
  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        fixtureCount: report.dataset.fixtureCount,
        overallPass: report.overallPass,
        outJsonPath,
        outMdPath,
      },
      null,
      2
    )
  );
  console.log('REAL_SAMPLE_STABILITY_REPORT_WRITTEN');
  if (!report.overallPass) {
    process.exit(1);
  }
}

module.exports = {
  runRealSampleStabilityReport,
};
