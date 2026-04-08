const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createEditorSession,
  multiSelectObjects,
  moveSelected,
  deleteSelected,
} = require('../../packages/editor-state/dist/index.js');

function makeProject(objectCount = 3) {
  const objects = {};
  for (let index = 0; index < objectCount; index += 1) {
    const id = `obj_${index + 1}`;
    objects[id] = {
      id,
      objectType: 'shape_node',
      name: id,
      visible: true,
      locked: false,
      zIndex: index + 1,
      bbox: { x: index * 20, y: index * 10, w: 10, h: 10 },
      transform: { translate: [0, 0], scale: [1, 1], rotate: 0 },
      styleRef: null,
      capabilities: ['select', 'drag', 'delete'],
      provenance: {
        sourceId: 'src_test',
        originNodeId: id,
        originTag: 'rect',
        originFileKind: 'svg',
        originAttributesSnapshot: {},
        originStyleSnapshot: {},
        liftedBy: 'generic_importer',
        liftConfidence: 'medium',
        degradationReason: 'none',
        importedAt: '2026-04-08T00:00:00.000Z',
      },
      stability: {
        level: 'semantic',
        reason: 'test',
        confidence: 'high',
        editableCaps: ['select', 'drag', 'delete'],
        visualRisk: 'none',
        interactionRisk: 'none',
        notes: [],
      },
      manualEdits: [],
      shapeKind: 'rect',
      geometry: { attributes: { x: String(index * 20), y: String(index * 10), width: '10', height: '10' } },
      stroke: { color: '#000000', width: 1, dasharray: null },
      fill: { color: '#ffffff', opacity: 1 },
    };
  }

  return {
    schemaVersion: '1.0.0-mvp',
    project: {
      projectId: 'proj_test',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
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
        renderTreeRootId: 'obj_1',
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
      objects,
    },
  };
}

test('moveSelected batches multi-selection into one snapshot', () => {
  let state = createEditorSession(makeProject(3));
  state = multiSelectObjects(state, ['obj_1', 'obj_2', 'obj_3']);
  state = moveSelected(state, 5, 7);

  assert.equal(state.project.project.history.undoStack.length, 1);
  assert.equal(state.project.project.history.redoStack.length, 0);
  assert.equal(state.project.project.objects.obj_1.bbox.x, 5);
  assert.equal(state.project.project.objects.obj_1.bbox.y, 7);
  assert.equal(state.project.project.objects.obj_2.bbox.x, 25);
  assert.equal(state.project.project.objects.obj_2.bbox.y, 17);
  assert.equal(state.project.project.history.undoStack[0].project.history.undoStack.length, 0);
  assert.equal(state.project.project.history.undoStack[0].project.history.redoStack.length, 0);
});

test('repeated moveSelected operations stay bounded and keep lightweight history snapshots', () => {
  let state = createEditorSession(makeProject(3));
  state = multiSelectObjects(state, ['obj_1', 'obj_2', 'obj_3']);

  for (let index = 0; index < 100; index += 1) {
    state = moveSelected(state, 1, 2);
  }

  assert.equal(state.project.project.history.undoStack.length <= 64, true);
  assert.equal(state.project.project.history.operationLog.length <= 200, true);
  assert.equal(state.project.project.history.undoStack[0].project.history.undoStack.length, 0);
  assert.equal(state.project.project.history.undoStack[0].project.history.redoStack.length, 0);
  assert.equal(state.project.project.objects.obj_1.bbox.x, 100);
  assert.equal(state.project.project.objects.obj_1.bbox.y, 200);
});

test('deleteSelected removes multi-selection in one snapshot', () => {
  let state = createEditorSession(makeProject(2));
  state = multiSelectObjects(state, ['obj_1', 'obj_2']);
  state = deleteSelected(state);

  assert.equal(state.project.project.history.undoStack.length, 1);
  assert.equal(state.selection.selectedIds.length, 0);
  assert.equal(Object.keys(state.project.project.objects).length, 0);
});
