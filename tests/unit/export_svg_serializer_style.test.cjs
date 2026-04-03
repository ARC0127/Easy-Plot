const test = require('node:test');
const assert = require('node:assert/strict');

const { exportSVG } = require('../../packages/core-export-svg/dist/index.js');

function makeBaseProject(shapeObject) {
  return {
    schemaVersion: '1.0.0-mvp',
    project: {
      projectId: 'proj_test',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceMode: 'imported',
      originalSources: [],
      figure: {
        figureId: 'fig_test',
        width: 320,
        height: 180,
        viewBox: [0, 0, 320, 180],
        background: '#ffffff',
        panels: [],
        legends: [],
        floatingObjects: [],
        renderTreeRootId: 'obj_root',
        constraints: [],
        metadata: { title: '', description: '', tags: [] },
      },
      importRecords: [],
      history: { undoStack: [], redoStack: [], operationLog: [] },
      exportPolicy: {
        defaultExportKind: 'svg',
        svg: { preferTextNode: true, flattenFragileObjects: false, embedImages: true },
        html: { mode: 'inline_svg_preferred', inlineStyles: true, externalCSS: false },
      },
      objects: {
        [shapeObject.id]: shapeObject,
      },
    },
  };
}

function baseShape(overrides = {}) {
  return {
    id: 'obj_shape_1',
    objectType: 'shape_node',
    name: 'shape_1',
    visible: true,
    locked: false,
    zIndex: 1,
    bbox: { x: 20, y: 40, w: 120, h: 60 },
    transform: { translate: [0, 0], scale: [1, 1], rotate: 0 },
    styleRef: null,
    capabilities: ['select', 'drag'],
    provenance: {
      sourceId: 'src_1',
      originNodeId: 'n1',
      originTag: 'rect',
      originFileKind: 'svg',
      originAttributesSnapshot: {},
      originStyleSnapshot: {},
      liftedBy: 'generic_importer',
      liftConfidence: 'medium',
      degradationReason: 'none',
      importedAt: '2026-04-03T00:00:00.000Z',
    },
    stability: {
      level: 'semantic',
      reason: 'test',
      confidence: 'high',
      editableCaps: ['select', 'drag'],
      visualRisk: 'none',
      interactionRisk: 'none',
      notes: [],
    },
    manualEdits: [],
    shapeKind: 'rect',
    geometry: { attributes: { x: '20', y: '40', width: '120', height: '60' } },
    stroke: { color: 'none', width: 1, dasharray: null },
    fill: { color: null, opacity: 1 },
    ...overrides,
  };
}

test('exportSVG shape fallback avoids browser default black fill for style-missing rect', () => {
  const project = makeBaseProject(baseShape());
  const artifact = exportSVG(project);
  assert.equal(artifact.kind, 'svg');
  assert.equal(artifact.content.includes('fill="none"'), true);
  assert.equal(artifact.content.includes('stroke="#334155"'), true);
});

test('exportSVG preserves attribute fill/stroke when object style snapshot is empty', () => {
  const shape = baseShape({
    geometry: {
      attributes: {
        x: '20',
        y: '40',
        width: '120',
        height: '60',
        fill: '#ff00aa',
        stroke: '#0055ff',
      },
    },
  });
  const project = makeBaseProject(shape);
  const artifact = exportSVG(project);
  assert.equal(artifact.content.includes('fill="#ff00aa"'), true);
  assert.equal(artifact.content.includes('stroke="#0055ff"'), true);
  assert.equal(artifact.content.includes('fill="none"'), false);
});
