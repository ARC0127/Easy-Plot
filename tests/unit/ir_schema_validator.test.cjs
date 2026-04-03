const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInvariants } = require('../../packages/ir-schema/dist/validators/invariantValidator.js');

function makeProject(textKind, capabilities) {
  return {
    schemaVersion: '1.0.0-mvp',
    project: {
      projectId: 'proj_test',
      createdAt: '2026-04-02T00:00:00Z',
      updatedAt: '2026-04-02T00:00:00Z',
      sourceMode: 'imported',
      originalSources: [{
        sourceId: 'src_test',
        kind: 'svg',
        path: '/virtual/test.svg',
        sha256: 'x',
        familyHint: 'matplotlib',
        importedAt: '2026-04-02T00:00:00Z'
      }],
      figure: {
        figureId: 'fig_test',
        width: 100,
        height: 100,
        viewBox: [0, 0, 100, 100],
        background: '#fff',
        panels: [],
        legends: [],
        floatingObjects: [],
        renderTreeRootId: 'obj_n1',
        constraints: [],
        metadata: { title: '', description: '', tags: [] }
      },
      importRecords: [],
      history: { undoStack: [], redoStack: [], operationLog: [] },
      exportPolicy: {
        defaultExportKind: 'svg',
        svg: { preferTextNode: true, flattenFragileObjects: false, embedImages: true },
        html: { mode: 'inline_svg_preferred', inlineStyles: true, externalCSS: false }
      },
      objects: {
        obj_n1: {
          id: 'obj_n1',
          objectType: 'text_node',
          name: 'text',
          visible: true,
          locked: false,
          zIndex: 0,
          bbox: { x: 0, y: 0, w: 10, h: 10 },
          transform: { translate: [0, 0], scale: [1, 1], rotate: 0 },
          styleRef: null,
          capabilities,
          provenance: {
            originFileKind: 'svg',
            originSourceId: 'src_test',
            originNodeIds: ['n1'],
            originSelectorOrPath: null,
            originBBox: { x: 0, y: 0, w: 10, h: 10 },
            originStyleSnapshot: {},
            liftedBy: 'generic_importer',
            liftConfidence: 'high',
            degradationReason: textKind === 'raw_text' ? 'none' : 'text_as_path'
          },
          stability: {
            exportStabilityClass: 'stable',
            requiresSnapshotRendering: false,
            reimportExpectation: 'semantic',
            equivalenceTarget: 'EQ-L2'
          },
          manualEdits: [],
          textKind,
          content: 'x',
          position: [0, 0],
          font: { family: 'Arial', size: 12, weight: '400', style: 'normal' },
          fill: '#000'
        }
      }
    }
  };
}

test('raw text must keep text_edit capability', () => {
  const report = validateInvariants(makeProject('raw_text', ['select', 'text_edit']));
  assert.equal(report.ok, true);
});

test('proxy text cannot pretend text_edit', () => {
  const report = validateInvariants(makeProject('path_text_proxy', ['select', 'text_edit']));
  assert.equal(report.ok, false);
});
