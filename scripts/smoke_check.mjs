import { validateInvariants } from '../packages/ir-schema/src/validators/invariantValidator.ts';

const validProject = {
  schemaVersion: '1.0.0-mvp',
  project: {
    projectId: 'proj_001',
    createdAt: '2026-04-02T00:00:00Z',
    updatedAt: '2026-04-02T00:00:00Z',
    sourceMode: 'imported',
    originalSources: [{
      sourceId: 'src_001',
      kind: 'svg',
      path: 'fixtures/input.svg',
      sha256: 'dummy',
      familyHint: 'llm_svg',
      importedAt: '2026-04-02T00:00:00Z'
    }],
    figure: {
      figureId: 'fig_001',
      width: 1200,
      height: 800,
      viewBox: [0,0,1200,800],
      background: '#fff',
      panels: ['panel_1'],
      legends: ['legend_1'],
      floatingObjects: [],
      renderTreeRootId: 'group_root',
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
      panel_1: {
        id: 'panel_1', objectType: 'panel', name: 'Panel A', visible: true, locked: false, zIndex: 1,
        bbox: { x: 0, y: 0, w: 100, h: 100 },
        transform: { translate: [0,0], scale: [1,1], rotate: 0 },
        styleRef: null,
        capabilities: ['select','drag','resize','delete','reparent'],
        provenance: {
          originFileKind: 'svg', originSourceId: 'src_001', originNodeIds: ['n1'], originSelectorOrPath: null,
          originBBox: { x: 0, y: 0, w: 100, h: 100 }, originStyleSnapshot: {},
          liftedBy: 'llm_svg_adapter', liftConfidence: 'medium', degradationReason: 'none'
        },
        stability: {
          exportStabilityClass: 'stable', requiresSnapshotRendering: false,
          reimportExpectation: 'semantic', equivalenceTarget: 'EQ-L2'
        },
        manualEdits: [],
        label: 'a', titleObjectId: null, layoutRole: 'plot_panel',
        anchor: { kind: 'figure_anchor', value: 'top_left' }, offset: [0,0], contentRootId: 'group_root', childObjectIds: [],
        axisHints: { hasXAxis: true, hasYAxis: true, hasColorbar: false, axisGroupIds: [] }
      },
      legend_1: {
        id: 'legend_1', objectType: 'legend', name: 'Legend', visible: true, locked: false, zIndex: 2,
        bbox: { x: 10, y: 10, w: 40, h: 20 },
        transform: { translate: [0,0], scale: [1,1], rotate: 0 },
        styleRef: null,
        capabilities: ['select','drag','delete','reparent'],
        provenance: {
          originFileKind: 'svg', originSourceId: 'src_001', originNodeIds: ['n2'], originSelectorOrPath: null,
          originBBox: { x: 10, y: 10, w: 40, h: 20 }, originStyleSnapshot: {},
          liftedBy: 'llm_svg_adapter', liftConfidence: 'medium', degradationReason: 'none'
        },
        stability: {
          exportStabilityClass: 'stable', requiresSnapshotRendering: false,
          reimportExpectation: 'semantic', equivalenceTarget: 'EQ-L2'
        },
        manualEdits: [],
        itemObjectIds: [], anchor: { kind: 'panel_anchor', value: 'top_right', targetPanelId: 'panel_1' }, offset: [0,0], orientation: 'vertical', floating: true
      },
      text_1: {
        id: 'text_1', objectType: 'text_node', name: 'Title', visible: true, locked: false, zIndex: 3,
        bbox: { x: 0, y: 0, w: 50, h: 10 },
        transform: { translate: [0,0], scale: [1,1], rotate: 0 },
        styleRef: null,
        capabilities: ['select','drag','delete','text_edit'],
        provenance: {
          originFileKind: 'svg', originSourceId: 'src_001', originNodeIds: ['n3'], originSelectorOrPath: null,
          originBBox: { x: 0, y: 0, w: 50, h: 10 }, originStyleSnapshot: {},
          liftedBy: 'generic_importer', liftConfidence: 'high', degradationReason: 'none'
        },
        stability: {
          exportStabilityClass: 'stable', requiresSnapshotRendering: false,
          reimportExpectation: 'semantic', equivalenceTarget: 'EQ-L2'
        },
        manualEdits: [],
        textKind: 'raw_text', content: 'Hello', position: [0,0],
        font: { family: 'Arial', size: 12, weight: '400', style: 'normal' }, fill: '#000'
      }
    }
  }
};

const invalidProject = structuredClone(validProject);
invalidProject.project.objects.text_1.capabilities = ['select', 'text_edit', 'group_only'];
invalidProject.project.objects.legend_1.capabilities = ['select', 'text_edit'];
invalidProject.project.objects.text_1.textKind = 'path_text_proxy';

const validReport = validateInvariants(validProject);
const invalidReport = validateInvariants(invalidProject);

console.log(JSON.stringify({
  validOk: validReport.ok,
  invalidOk: invalidReport.ok,
  invalidIssueCodes: invalidReport.issues.map(x => x.code).sort()
}, null, 2));
