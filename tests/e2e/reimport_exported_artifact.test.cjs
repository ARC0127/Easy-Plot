const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../../packages/core-capability/dist/index.js');
const { exportSVG } = require('../../packages/core-export-svg/dist/index.js');
const { reimportExportedArtifact } = require('../../packages/testing-metrics/dist/index.js');

test('exported svg can be reimported through public reimport API', () => {
  const filePath = path.join(__dirname, '../../packages/testing-fixtures/data/llm_svg/llm_001.svg');
  const content = fs.readFileSync(filePath, 'utf8');
  const source = {
    sourceId: 'e2e_src_reimport',
    kind: 'svg',
    path: '/virtual/e2e/llm_001.svg',
    sha256: 'generated',
    familyHint: 'llm_svg',
    importedAt: new Date().toISOString(),
  };

  const parsed = parseDocument({ path: source.path, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const project = assignCapabilities(lifted.project).project;

  const artifact = exportSVG(project);
  const report = reimportExportedArtifact(artifact, source);

  assert.equal(report.artifactKind, 'svg');
  assert.equal(report.project.schemaVersion, '1.0.0-mvp');
  assert.ok(report.hintCount >= 0);
});
