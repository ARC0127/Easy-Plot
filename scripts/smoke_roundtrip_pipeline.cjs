
const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { exportSVG } = require('../packages/core-export-svg/dist/index.js');
const { exportHTML } = require('../packages/core-export-html/dist/index.js');
const { computeVisualEquivalence, computeInteractionRetention } = require('../packages/testing-metrics/dist/index.js');
const { validateProject, validateInvariants, validateCapabilityConflicts } = require('../packages/ir-schema/dist/index.js');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="figure_1" viewBox="0 0 320 180" width="320" height="180">
  <g id="axes_1">
    <text id="text_1" x="20" y="20">Title</text>
    <rect id="rect_1" x="20" y="40" width="100" height="60" fill="#dbeafe" stroke="#334155" />
  </g>
  <g id="legend_1"><text x="220" y="20">Legend</text></g>
</svg>`;

const source = {
  sourceId: 'src_roundtrip',
  kind: 'svg',
  path: '/virtual/roundtrip.svg',
  sha256: 'dummy',
  familyHint: 'matplotlib',
  importedAt: new Date().toISOString(),
};

function importProject(path, content, sourceRef) {
  const parsed = parseDocument({ path, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, sourceRef);
  return assignCapabilities(lifted.project).project;
}

const before = importProject(source.path, svg, source);
const svgArtifact = exportSVG(before);
const htmlArtifact = exportHTML(before);
const afterSvg = importProject('/virtual/exported.svg', svgArtifact.content, {
  sourceId: 'src_reimport_svg', kind: 'svg', path: '/virtual/exported.svg', sha256: 'dummy2', familyHint: 'llm_svg', importedAt: new Date().toISOString(),
});
const visual = computeVisualEquivalence(before, afterSvg, svg, svgArtifact.content);
const retention = computeInteractionRetention(before, afterSvg);
const schema = validateProject(afterSvg);
const inv = validateInvariants(afterSvg);
const caps = validateCapabilityConflicts(afterSvg);

console.log(JSON.stringify({
  exportedSvgLength: svgArtifact.content.length,
  exportedHtmlLength: htmlArtifact.content.length,
  visualPass: visual.pass,
  semanticBBoxPass: visual.semanticBBoxPass,
  rasterDiffPass: visual.rasterDiffPass,
  normalizedPixelDiff: visual.normalizedPixelDiff,
  diffMode: visual.comparisonMode,
  diffWarning: visual.warning || null,
  retentionPass: retention.pass,
  retentionRate: retention.retentionRate,
  schemaOk: schema.ok,
  invariantOk: inv.ok,
  capabilityOk: caps.length === 0,
}, null, 2));

if (!schema.ok || !inv.ok || caps.length > 0) process.exit(1);
console.log('SMOKE_ROUNDTRIP_PIPELINE_PASS');
