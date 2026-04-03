
const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { createEditorSession, selectObject, moveSelected, editSelectedText, promoteSelected, validateCurrentProject } = require('../packages/editor-state/dist/index.js');
const { buildTreeViewModel } = require('../packages/editor-tree/dist/index.js');
const { buildPropertyViewModel } = require('../packages/editor-properties/dist/index.js');
const { buildLatestImportReport } = require('../packages/editor-import-report/dist/index.js');
const { hitTestAtPoint, buildSelectionOverlay } = require('../packages/editor-canvas/dist/index.js');

const svg = `<?xml version="1.0"?><svg width="300" height="120" viewBox="0 0 300 120"><g id="axes_1"><text x="10" y="20">Title</text><rect x="10" y="30" width="100" height="60"/></g><g id="legend_1"><text x="200" y="20">Legend</text></g></svg>`;
const source = {
  sourceId: 'src_smoke_editor',
  kind: 'svg',
  path: '/virtual/editor.svg',
  sha256: 'dummy',
  familyHint: 'matplotlib',
  importedAt: new Date().toISOString(),
};

const parsed = parseDocument({ path: source.path, content: svg });
const normalized = normalizeDocument(parsed);
const family = classifyFamily(normalized);
const hints = runAdapters(normalized, family);
const lifted = liftToIR(normalized, hints, source);
const cap = assignCapabilities(lifted.project);
let state = createEditorSession(cap.project);

const textId = Object.values(state.project.project.objects).find(o => o.objectType === 'text_node' && o.capabilities.includes('text_edit')).id;
state = selectObject(state, textId);
state = moveSelected(state, 5, 7);
state = editSelectedText(state, 'Edited Title');
state = promoteSelected(state, 'legend', 'smoke_promote');

const validation = validateCurrentProject(state);
const tree = buildTreeViewModel(state.project);
const prop = buildPropertyViewModel(state.project, textId);
const report = buildLatestImportReport(state.project);
const hit = hitTestAtPoint(state.project, 16, 28);
const overlay = buildSelectionOverlay(state.project, state.selection.selectedIds);

console.log(JSON.stringify({
  family,
  hintCount: hints.hints.length,
  objectCount: Object.keys(state.project.project.objects).length,
  treeRoots: tree.length,
  propObjectType: prop?.objectType ?? null,
  importFamily: report?.familyClassifiedAs ?? null,
  hitObjectType: hit?.objectType ?? null,
  overlayCount: overlay.length,
  validationOk: validation.ok,
  schemaOk: validation.schema.ok,
  invariantOk: validation.invariants.ok,
  capabilityOk: validation.capabilities.ok,
}, null, 2));
if (!validation.ok) {
  process.exit(1);
}
console.log('SMOKE_EDITOR_PIPELINE_PASS');
