const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDesktopBootstrap } = require('../apps/desktop/dist/main/index.js');
const { createDesktopBridge } = require('../apps/desktop/dist/preload/index.js');
const { createRendererBootstrap, createDesktopWorkbench } = require('../apps/desktop/dist/renderer/index.js');

const desktop = createDesktopBootstrap();
const bridge = createDesktopBridge();
const renderer = createRendererBootstrap();
const workbench = createDesktopWorkbench();

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180">
  <g id="axes_1"><text id="text_title" x="20" y="20">Title</text><rect x="20" y="40" width="100" height="60"/></g>
  <g id="axes_2"><rect x="180" y="40" width="100" height="60"/></g>
  <g id="legend_1"><text id="text_legend" x="220" y="20">Legend</text></g>
</svg>`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-desktop-'));
const sourceFilePath = path.join(tmpDir, 'desktop-smoke.svg');
const projectFilePath = path.join(tmpDir, 'desktop-smoke.project.json');
fs.writeFileSync(sourceFilePath, sampleSvg, 'utf8');

let view = workbench.importFromFile(sourceFilePath, 'matplotlib');
const statusAfterImport = workbench.linkedStatus();
const importTreeCount = view.objectTree.length;
const importReportFamily = view.importReport?.familyClassifiedAs ?? null;

view = workbench.selectAtPoint(25, 45);
const statusAfterHit = workbench.linkedStatus();
const selectedAfterHit = view.canvas.selectedIds[0] ?? null;
const propertiesAfterHit = view.properties?.objectType ?? null;

view = workbench.moveSelected(8, 0);
const overlaysAfterMove = view.canvas.overlays.length;

view = workbench.selectFirstEditableText();
view = workbench.editSelectedText('Legend Updated');
const propertiesAfterEdit = view.properties?.extra?.content ?? null;

const rootIdsBeforePromote = view.objectTree.map((node) => node.id);
const treeCountBeforePromote = rootIdsBeforePromote.length;
if (rootIdsBeforePromote.length > 1) {
  view = workbench.multiSelectByIds(rootIdsBeforePromote.slice(0, 2));
  view = workbench.promoteSelection('group_node', 'desktop_smoke_promote');
}
const treeCountAfterPromote = view.objectTree.length;
const statusAfterPromote = workbench.linkedStatus();

view = workbench.saveProjectToFile(projectFilePath);
const statusAfterSave = workbench.linkedStatus();
view = workbench.loadProjectFromFile(projectFilePath);
const statusAfterLoad = workbench.linkedStatus();

console.log(
  JSON.stringify(
    {
      appName: desktop.appName,
      layoutRegionCount: desktop.layout.length,
      offline: desktop.supportsOffline,
      localFs: desktop.supportsLocalFilesystem,
      windowLifecycle: desktop.supportsWindowLifecycle,
      releaseBundle: desktop.supportsReleaseBundle,
      bridgePing: bridge.ping(),
      rendererCenterPanels: renderer.layout.center.length,
      rendererBottomPanels: renderer.layout.bottom.length,
      importTreeCount,
      importReportFamily,
      linkedRegionCount: statusAfterImport.regionCount,
      linkedHasImportReportAtImport: statusAfterImport.hasImportReport,
      selectedAfterHit,
      propertiesAfterHit,
      linkedSelectionAfterHit: statusAfterHit.selectedCount,
      linkedPropertiesAfterHit: statusAfterHit.hasProperties,
      overlaysAfterMove,
      propertiesAfterEdit,
      treeCountBeforePromote,
      treeCountAfterPromote,
      linkedSelectionAfterPromote: statusAfterPromote.selectedCount,
      linkedImportReportAfterPromote: statusAfterPromote.hasImportReport,
      linkedProjectFileAfterSave: statusAfterSave.hasLoadedProjectFile,
      linkedProjectFileAfterLoad: statusAfterLoad.hasLoadedProjectFile,
      linkedStatusIsOperational:
        statusAfterImport.regionCount === 4 &&
        statusAfterImport.hasImportReport &&
        statusAfterHit.hasProperties &&
        statusAfterPromote.hasImportReport &&
        statusAfterSave.hasLoadedProjectFile &&
        statusAfterLoad.hasLoadedProjectFile,
    },
    null,
    2
  )
);

console.log('SMOKE_DESKTOP_PASS');
