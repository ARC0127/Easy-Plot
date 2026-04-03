const fs = require('node:fs');
const path = require('node:path');

const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { noOpRoundTrip, computeAcceptanceMetrics, familyPass, globalPass } = require('../packages/testing-metrics/dist/index.js');
const { applyOperation } = require('../packages/core-history/dist/index.js');
const { loadFixtureRegistry, getGroundTruth } = require('../packages/testing-fixtures/dist/index.js');

const THRESHOLDS = {
  matplotlib: {
    panel_detection_recall: 0.90,
    legend_detection_success_rate: 0.85,
    true_text_editable_rate: 0.95,
    import_visual_equivalence_pass_rate: 0.90,
    single_edit_roundtrip_pass_rate: 0.85,
    reimport_interaction_retention_rate: 0.90,
    raster_block_correct_label_rate: 0.95,
  },
  chart_family: {
    panel_detection_recall: 0.80,
    legend_detection_success_rate: 0.80,
    true_text_editable_rate: 0.90,
    import_visual_equivalence_pass_rate: 0.85,
    single_edit_roundtrip_pass_rate: 0.80,
    reimport_interaction_retention_rate: 0.85,
  },
  illustration_like: {
    panel_detection_recall: 0.75,
    legend_detection_success_rate: 0.75,
    true_text_editable_rate: 0.90,
    import_visual_equivalence_pass_rate: 0.90,
    single_edit_roundtrip_pass_rate: 0.85,
    reimport_interaction_retention_rate: 0.85,
  },
  llm_svg: {
    panel_detection_recall: 0.65,
    legend_detection_success_rate: 0.70,
    true_text_editable_rate: 0.75,
    import_visual_equivalence_pass_rate: 0.80,
    single_edit_roundtrip_pass_rate: 0.75,
    reimport_interaction_retention_rate: 0.75,
    raster_block_correct_label_rate: 0.95,
  },
  static_html_inline_svg: {
    panel_detection_recall: 0.70,
    legend_detection_success_rate: 0.75,
    true_text_editable_rate: 0.85,
    import_visual_equivalence_pass_rate: 0.85,
    single_edit_roundtrip_pass_rate: 0.80,
    reimport_interaction_retention_rate: 0.80,
  },
  degraded_svg: {
    panel_detection_recall: 0.50,
    legend_detection_success_rate: 0.55,
    editable_or_honestly_labeled_rate: 0.95,
    import_visual_equivalence_pass_rate: 0.85,
    single_edit_roundtrip_pass_rate: 0.70,
    reimport_interaction_retention_rate: 0.65,
    raster_block_correct_label_rate: 0.98,
  },
};

function loadFixtureContent(record) {
  const ext = record.kind === 'html' ? '.html' : '.svg';
  const localPath = path.join(__dirname, '..', 'packages', 'testing-fixtures', 'data', record.family, `${record.fixtureId}${ext}`);
  return fs.readFileSync(localPath, 'utf8');
}

function importFixture(record) {
  const content = loadFixtureContent(record);
  const sourcePath = `/virtual/${record.family}/${record.fixtureId}.${record.kind === 'html' ? 'html' : 'svg'}`;
  const source = {
    sourceId: `src_${record.fixtureId}`,
    kind: record.kind,
    path: sourcePath,
    sha256: 'generated',
    familyHint: record.family,
    importedAt: new Date().toISOString(),
  };

  const parsed = parseDocument({ path: sourcePath, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const cap = assignCapabilities(lifted.project);

  return { project: cap.project, source, content };
}

function countTextEditable(project) {
  return Object.values(project.project.objects).filter(
    (obj) => (obj.objectType === 'text_node' || obj.objectType === 'html_block') && obj.capabilities.includes('text_edit')
  ).length;
}

function countHonestRaster(project) {
  return Object.values(project.project.objects).filter(
    (obj) => obj.objectType === 'image_node' && !obj.capabilities.includes('text_edit')
  ).length;
}

function computeHonestProxyTextRate(project) {
  const proxies = Object.values(project.project.objects).filter(
    (obj) => obj.objectType === 'text_node' && obj.textKind !== 'raw_text'
  );
  if (proxies.length === 0) return 1;
  const honest = proxies.filter((obj) => !obj.capabilities.includes('text_edit')).length;
  return honest / proxies.length;
}

function computeFixtureMetrics(record) {
  const gt = getGroundTruth(record.fixtureId);
  const { project, source } = importFixture(record);
  const roundtrip = noOpRoundTrip(project, source);

  const panelDetectionRecall = gt.panelIds.length === 0
    ? 1
    : Math.min(project.project.figure.panels.length, gt.panelIds.length) / gt.panelIds.length;

  const legendDetectionSuccessRate = gt.hasLegend
    ? project.project.figure.legends.some((legendId) => project.project.objects[legendId]?.capabilities.includes('drag'))
      ? 1
      : 0
    : 1;

  const trueTextEditableRate = gt.editableRawTextIds.length === 0
    ? 1
    : Math.min(countTextEditable(project), gt.editableRawTextIds.length) / gt.editableRawTextIds.length;

  const rasterBlockCorrectLabelRate = gt.atomicRasterIds.length === 0
    ? 1
    : Math.min(countHonestRaster(project), gt.atomicRasterIds.length) / gt.atomicRasterIds.length;

  const targetObjectId = project.project.figure.panels[0] ?? Object.keys(project.project.objects)[0];
  const singleEditProject = targetObjectId
    ? applyOperation(project, { type: 'MOVE_OBJECT', payload: { objectId: targetObjectId, delta: { x: 4, y: 4 } } })
    : project;
  const singleEditRoundtrip = noOpRoundTrip(singleEditProject, source);
  const singleEditRoundtripPassRate = singleEditRoundtrip.visual.pass ? 1 : 0;

  const metrics = {
    panel_detection_recall: panelDetectionRecall,
    legend_detection_success_rate: legendDetectionSuccessRate,
    true_text_editable_rate: trueTextEditableRate,
    editable_or_honestly_labeled_rate: (trueTextEditableRate + computeHonestProxyTextRate(project) + rasterBlockCorrectLabelRate) / 3,
    raster_block_correct_label_rate: rasterBlockCorrectLabelRate,
    import_visual_equivalence_pass_rate: roundtrip.visual.pass ? 1 : 0,
    single_edit_roundtrip_pass_rate: singleEditRoundtripPassRate,
    reimport_interaction_retention_rate: roundtrip.retention.retentionRate,
  };

  return { metrics, roundtrip };
}

function buildFamilyReports() {
  const registry = loadFixtureRegistry();
  const reportsByFamily = new Map();

  for (const record of registry) {
    const { metrics } = computeFixtureMetrics(record);
    const threshold = THRESHOLDS[record.family];
    const list = reportsByFamily.get(record.family) ?? [];
    list.push({ metrics, thresholds: threshold });
    reportsByFamily.set(record.family, list);
  }

  const summaries = Array.from(reportsByFamily.entries()).map(([family, reports]) => {
    const summary = computeAcceptanceMetrics(family, reports);
    return { ...summary, familyPass: familyPass(summary), fixtureCount: reports.length };
  });

  return { summaries, overallPass: globalPass(summaries) };
}

const result = buildFamilyReports();
const outDir = path.join(__dirname, '..', 'docs', 'audit');
const outPath = path.join(outDir, 'family_acceptance_report.json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(JSON.stringify(result, null, 2));
console.log(`FAMILY_ACCEPTANCE_REPORT_WRITTEN=${outPath}`);
