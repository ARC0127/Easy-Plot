const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../../packages/core-capability/dist/index.js');
const { noOpRoundTrip } = require('../../packages/testing-metrics/dist/index.js');

test('import -> no-op roundtrip keeps interaction retention in expected range', () => {
  const filePath = path.join(__dirname, '../../packages/testing-fixtures/data/matplotlib/mpl_001.svg');
  const content = fs.readFileSync(filePath, 'utf8');
  const source = {
    sourceId: 'e2e_src_001',
    kind: 'svg',
    path: '/virtual/e2e/mpl_001.svg',
    sha256: 'generated',
    familyHint: 'matplotlib',
    importedAt: new Date().toISOString(),
  };

  const parsed = parseDocument({ path: source.path, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const project = assignCapabilities(lifted.project).project;
  const report = noOpRoundTrip(project, source);

  assert.equal(report.after.schemaVersion, '1.0.0-mvp');
  assert.ok(report.retention.retentionRate >= 0);
  assert.ok(report.retention.retentionRate <= 1);
});
