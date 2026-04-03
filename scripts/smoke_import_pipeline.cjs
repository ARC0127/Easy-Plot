const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { validateInvariants, validateCapabilityConflicts } = require('../packages/ir-schema/dist/index.js');

const mplSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="figure_1" viewBox="0 0 400 200" width="400" height="200">
  <g id="axes_1" transform="translate(0,0)">
    <text id="text_1" x="20" y="20">Title</text>
    <g id="legend_1"><text x="300" y="20">Legend</text></g>
  </g>
  <g id="axes_2">
    <image id="img_1" x="220" y="40" width="120" height="100" xlink:href="data:image/png;base64,aaa" />
  </g>
</svg>`;

const htmlDoc = `<!DOCTYPE html>
<html><body>
  <figure id="fig1">
    <div id="panel-a"><svg id="inner" viewBox="0 0 100 100"><text x="10" y="20">Legend</text></svg></div>
    <figcaption>Caption</figcaption>
  </figure>
</body></html>`;

function runCase(name, path, content) {
  const parsed = parseDocument({ path, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const source = {
    sourceId: `${name}_source`,
    kind: path.endsWith('.html') ? 'html' : 'svg',
    path,
    sha256: 'dummy',
    familyHint: family,
    importedAt: new Date().toISOString(),
  };
  let { project, importRecord } = liftToIR(normalized, hints, source);
  ({ project } = assignCapabilities(project));
  const inv = validateInvariants(project);
  const cap = validateCapabilityConflicts(project);
  console.log(`CASE=${name}`);
  console.log(JSON.stringify({ family, hints: hints.hints.length, semanticCount: importRecord.metrics.liftedSemanticObjectCount, invOk: inv.ok, capIssues: cap.length }, null, 2));
  if (!inv.ok || cap.length > 0) {
    throw new Error(`Smoke pipeline failed for ${name}`);
  }
}

runCase('mpl_like', 'sample.svg', mplSvg);
runCase('html_like', 'sample.html', htmlDoc);
console.log('SMOKE_IMPORT_PIPELINE_PASS');
