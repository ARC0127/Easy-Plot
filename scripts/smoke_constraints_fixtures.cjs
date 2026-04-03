const { parseDocument } = require('../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../packages/core-normalizer/dist/index.js');
const { classifyFamily, runAdapters } = require('../packages/importer-adapters/dist/index.js');
const { liftToIR } = require('../packages/core-lifter/dist/index.js');
const { assignCapabilities } = require('../packages/core-capability/dist/index.js');
const { createEditorSession, selectObject } = require('../packages/editor-state/dist/index.js');
const { setAnchorForSelected, alignSelected, distributeSelected, keepSelectedInside, relayoutAllPanels } = require('../packages/editor-state/dist/index.js');
const { resolveAnchor, buildGuides, snapPoint } = require('../packages/core-constraints/dist/index.js');
const { loadFixtureRegistry, getFixturesByFamily, getGroundTruth, SUPPORTED_FIXTURE_FAMILIES } = require('../packages/testing-fixtures/dist/index.js');

const registry = loadFixtureRegistry();
const mplFixtures = getFixturesByFamily('matplotlib');
const gt = getGroundTruth('mpl_001');

const svg = `<?xml version="1.0"?><svg viewBox="0 0 320 180" width="320" height="180"><g id="axes_1"><text id="text_title" x="20" y="20">Title</text><rect x="20" y="40" width="100" height="60"/></g><g id="axes_2"><rect x="180" y="40" width="100" height="60"/></g><g id="legend_1"><text x="220" y="20">Legend</text></g></svg>`;
const source = { sourceId: 'src_constraints', kind: 'svg', path: '/virtual/constraints.svg', sha256: 'dummy', familyHint: 'matplotlib', importedAt: new Date().toISOString() };
const parsed = parseDocument({ path: source.path, content: svg });
const normalized = normalizeDocument(parsed);
const family = classifyFamily(normalized);
const hints = runAdapters(normalized, family);
const lifted = liftToIR(normalized, hints, source);
const cap = assignCapabilities(lifted.project);
let state = createEditorSession(cap.project);

const legendId = Object.values(state.project.project.objects).find(o => o.objectType === 'legend').id;
state = selectObject(state, legendId);
state = setAnchorForSelected(state, { kind: 'figure_anchor', value: 'top_right' }, [-24, 8]);
const anchorPoint = resolveAnchor(state.project, legendId);
const guides = buildGuides(state.project);
const snap = snapPoint(state.project, anchorPoint.x + 2, anchorPoint.y + 1, 6);

const panelIds = state.project.project.figure.panels;
state = { ...state, selection: { ...state.selection, selectedIds: panelIds } };
state = alignSelected(state, 'align_top');
state = distributeSelected(state, 'equal_spacing_horizontal');
state = relayoutAllPanels(state, 'horizontal', 10);
state = keepSelectedInside(state, null);

console.log(JSON.stringify({
  family,
  supportedFamilies: SUPPORTED_FIXTURE_FAMILIES.length,
  registryCount: registry.length,
  mplFixtureCount: mplFixtures.length,
  gtPanelCount: gt.panelIds.length,
  constraintCount: state.project.project.figure.constraints.length,
  anchorResolved: anchorPoint,
  guideCount: guides.length,
  snappedX: snap.snappedX,
  snappedY: snap.snappedY,
  panelCount: state.project.project.figure.panels.length,
}, null, 2));
console.log('SMOKE_CONSTRAINTS_FIXTURES_PASS');
