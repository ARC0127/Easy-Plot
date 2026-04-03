const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../../packages/core-capability/dist/index.js');
const { exportSVG } = require('../../packages/core-export-svg/dist/index.js');

test('lifter skips non-renderable defs subtree while preserving referenced defs for use-based rendering', () => {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="glyph_A" d="M 0 0 L 60 0 L 60 80 L 0 80 Z" fill="#000000" />
  </defs>
  <rect x="20" y="40" width="160" height="80" fill="#88aadd" />
  <g transform="translate(220,120)">
    <use href="#glyph_A" />
  </g>
</svg>`;

  const source = {
    sourceId: 'unit_defs_guard',
    kind: 'svg',
    path: '/virtual/unit/defs_guard.svg',
    sha256: 'generated',
    familyHint: 'unknown',
    importedAt: new Date().toISOString(),
  };

  const parsed = parseDocument({ path: source.path, content });
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const project = assignCapabilities(lifted.project).project;

  const shapeNodes = Object.values(project.project.objects).filter((obj) => obj.objectType === 'shape_node');
  assert.equal(shapeNodes.length >= 1, true);

  const artifact = exportSVG(project);
  assert.equal(artifact.content.includes('data-fe-object-id="obj_n3"'), false);
  assert.equal(artifact.content.includes('<defs>'), true);
  assert.equal(artifact.content.includes('id="glyph_A"'), true);
  assert.equal(artifact.content.includes('xlink:href="#glyph_A"'), true);
  assert.equal(artifact.content.includes('data-fe-bbox-x="220"'), true);
  assert.equal(artifact.content.includes('fill="#88aadd"'), true);
});
