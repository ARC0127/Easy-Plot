import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type { FamilyClass } from '../../../../packages/ir-schema/dist/index';
import { createDefaultRendererLayout } from '../renderer/layout';
import { renderDesktopShellDocument } from '../renderer/shellDocument';
import { createDesktopWorkbench, DesktopAppearancePatch, DesktopImportInput, DesktopLinkedStatus, DesktopViewSnapshot } from '../renderer/workbench';
const { copyFontPack } = require('../../../../scripts/font_pack.cjs');

export type DesktopRegionId = 'object_tree' | 'canvas' | 'properties' | 'import_report';
export type DesktopRegionDock = 'left' | 'center' | 'right' | 'bottom';
export type DesktopWindowState = 'created' | 'running' | 'closed';
export type DesktopHtmlMode = 'strict_static' | 'limited' | 'snapshot';

export interface DesktopWindowRegion {
  id: DesktopRegionId;
  title: string;
  dock: DesktopRegionDock;
}

export interface DesktopBootstrap {
  appName: string;
  layout: DesktopWindowRegion[];
  supportsOffline: boolean;
  supportsLocalFilesystem: boolean;
  supportsWindowLifecycle: boolean;
  supportsReleaseBundle: boolean;
}

export interface DesktopWindowSession {
  windowId: string;
  title: string;
  state: DesktopWindowState;
  openedAt: string | null;
  closedAt: string | null;
  renderRevision: number;
}

export interface DesktopReleaseBundleArtifact {
  outputDir: string;
  indexHtmlPath: string;
  manifestPath: string;
  generatedAt: string;
  windowId: string;
  renderRevision: number;
}

function createWindowSession(state: DesktopWindowState): DesktopWindowSession {
  return {
    windowId: `desktop_window_${Date.now()}`,
    title: 'Easy Plot',
    state,
    openedAt: null,
    closedAt: null,
    renderRevision: 0,
  };
}

export function createDesktopBootstrap(): DesktopBootstrap {
  return {
    appName: 'Easy Plot',
    layout: [
      { id: 'object_tree', title: 'Object Tree', dock: 'left' },
      { id: 'canvas', title: 'Canvas', dock: 'center' },
      { id: 'properties', title: 'Properties', dock: 'right' },
      { id: 'import_report', title: 'Import Report', dock: 'bottom' },
    ],
    supportsOffline: true,
    supportsLocalFilesystem: true,
    supportsWindowLifecycle: true,
    supportsReleaseBundle: true,
  };
}

export class DesktopAppShell {
  private readonly bootstrap: DesktopBootstrap = createDesktopBootstrap();
  private readonly workbench = createDesktopWorkbench();
  private window: DesktopWindowSession = createWindowSession('created');
  private currentView: DesktopViewSnapshot = this.workbench.snapshot();

  private ensureRunning(action: string): void {
    if (this.window.state !== 'running') {
      throw new Error(`Desktop window is not running; cannot execute ${action}.`);
    }
  }

  private syncView(view: DesktopViewSnapshot, options?: { bumpRenderRevision?: boolean }): DesktopViewSnapshot {
    this.currentView = view;
    if (this.window.state === 'running' && options?.bumpRenderRevision === true) {
      this.window.renderRevision += 1;
    }
    return view;
  }

  getBootstrap(): DesktopBootstrap {
    return { ...this.bootstrap, layout: this.bootstrap.layout.map((region) => ({ ...region })) };
  }

  getWindowSession(): DesktopWindowSession {
    return { ...this.window };
  }

  launchWindow(): DesktopWindowSession {
    if (this.window.state === 'running') return this.getWindowSession();
    if (this.window.state === 'closed') {
      this.window = createWindowSession('created');
      this.currentView = this.workbench.snapshot();
    }
    this.window.state = 'running';
    this.window.openedAt = new Date().toISOString();
    this.window.closedAt = null;
    return this.getWindowSession();
  }

  closeWindow(): DesktopWindowSession {
    if (this.window.state !== 'running') return this.getWindowSession();
    this.window.state = 'closed';
    this.window.closedAt = new Date().toISOString();
    return this.getWindowSession();
  }

  getLinkedStatus(): DesktopLinkedStatus {
    this.ensureRunning('getLinkedStatus');
    return {
      regionCount: 4,
      treeNodeCount: this.currentView.objectTree.length,
      selectedCount: this.currentView.canvas.selectedIds.length,
      overlayCount: this.currentView.canvas.overlays.length,
      hasProperties: this.currentView.properties !== null,
      hasImportReport: this.currentView.importReport !== null,
      hasLoadedProjectFile: this.workbench.hasLoadedProjectFile(),
    };
  }

  snapshot(): DesktopViewSnapshot {
    this.ensureRunning('snapshot');
    return this.currentView;
  }

  importFromFile(path: string, familyHint: FamilyClass = 'unknown', htmlMode: DesktopHtmlMode = 'limited'): DesktopViewSnapshot {
    this.ensureRunning('importFromFile');
    return this.syncView(this.workbench.importFromFile(path, familyHint, htmlMode), { bumpRenderRevision: true });
  }

  importDocument(input: DesktopImportInput): DesktopViewSnapshot {
    this.ensureRunning('importDocument');
    return this.syncView(this.workbench.importDocument(input), { bumpRenderRevision: true });
  }

  selectAtPoint(x: number, y: number, options?: { appendSelection?: boolean }): DesktopViewSnapshot {
    this.ensureRunning('selectAtPoint');
    return this.syncView(this.workbench.selectAtPoint(x, y, options));
  }

  selectTextAtPoint(x: number, y: number, maxDistance = 32): DesktopViewSnapshot {
    this.ensureRunning('selectTextAtPoint');
    return this.syncView(this.workbench.selectTextAtPoint(x, y, maxDistance));
  }

  selectObject(objectId: string): DesktopViewSnapshot {
    this.ensureRunning('selectObject');
    return this.syncView(this.workbench.selectById(objectId));
  }

  multiSelectByIds(objectIds: string[]): DesktopViewSnapshot {
    this.ensureRunning('multiSelectByIds');
    return this.syncView(this.workbench.multiSelectByIds(objectIds));
  }

  clearSelection(): DesktopViewSnapshot {
    this.ensureRunning('clearSelection');
    return this.syncView(this.workbench.clearSelection());
  }

  selectFirstEditableText(): DesktopViewSnapshot {
    this.ensureRunning('selectFirstEditableText');
    return this.syncView(this.workbench.selectFirstEditableText());
  }

  copySelection(): DesktopViewSnapshot {
    this.ensureRunning('copySelection');
    return this.syncView(this.workbench.copySelection());
  }

  pasteSelection(): DesktopViewSnapshot {
    this.ensureRunning('pasteSelection');
    return this.syncView(this.workbench.pasteSelection(), { bumpRenderRevision: true });
  }

  moveSelected(dx: number, dy: number): DesktopViewSnapshot {
    this.ensureRunning('moveSelected');
    return this.syncView(this.workbench.moveSelected(dx, dy), { bumpRenderRevision: true });
  }

  adjustSelectedCurve(deltaY: number): DesktopViewSnapshot {
    this.ensureRunning('adjustSelectedCurve');
    return this.syncView(this.workbench.adjustSelectedCurve(deltaY), { bumpRenderRevision: true });
  }

  adjustSelectedCurveHandle(handleId: string, dx: number, dy: number): DesktopViewSnapshot {
    this.ensureRunning('adjustSelectedCurveHandle');
    return this.syncView(this.workbench.adjustSelectedCurveHandle(handleId, dx, dy), { bumpRenderRevision: true });
  }

  editSelectedText(content: string): DesktopViewSnapshot {
    this.ensureRunning('editSelectedText');
    return this.syncView(this.workbench.editSelectedText(content), { bumpRenderRevision: true });
  }

  updateSelectedAppearance(patch: DesktopAppearancePatch): DesktopViewSnapshot {
    this.ensureRunning('updateSelectedAppearance');
    return this.syncView(this.workbench.updateSelectedAppearance(patch), { bumpRenderRevision: true });
  }

  updateSelectedTextStyle(patch: DesktopAppearancePatch): DesktopViewSnapshot {
    this.ensureRunning('updateSelectedTextStyle');
    return this.syncView(this.workbench.updateSelectedTextStyle(patch), { bumpRenderRevision: true });
  }

  updateDocumentFontFamily(fontFamily: string): DesktopViewSnapshot {
    this.ensureRunning('updateDocumentFontFamily');
    return this.syncView(this.workbench.updateDocumentFontFamily(fontFamily), { bumpRenderRevision: true });
  }

  addTextAtPoint(x: number, y: number, content: string): DesktopViewSnapshot {
    this.ensureRunning('addTextAtPoint');
    return this.syncView(this.workbench.addTextAtPoint(x, y, content), { bumpRenderRevision: true });
  }

  deleteSelected(): DesktopViewSnapshot {
    this.ensureRunning('deleteSelected');
    return this.syncView(this.workbench.deleteSelected(), { bumpRenderRevision: true });
  }

  promoteSelection(role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason = 'desktop_shell_promote'): DesktopViewSnapshot {
    this.ensureRunning('promoteSelection');
    return this.syncView(this.workbench.promoteSelection(role, reason), { bumpRenderRevision: true });
  }

  alignSelected(mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): DesktopViewSnapshot {
    this.ensureRunning('alignSelected');
    return this.syncView(this.workbench.alignSelected(mode), { bumpRenderRevision: true });
  }

  distributeSelected(mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): DesktopViewSnapshot {
    this.ensureRunning('distributeSelected');
    return this.syncView(this.workbench.distributeSelected(mode), { bumpRenderRevision: true });
  }

  undo(): DesktopViewSnapshot {
    this.ensureRunning('undo');
    return this.syncView(this.workbench.undo(), { bumpRenderRevision: true });
  }

  redo(): DesktopViewSnapshot {
    this.ensureRunning('redo');
    return this.syncView(this.workbench.redo(), { bumpRenderRevision: true });
  }

  saveProjectToFile(path: string): DesktopViewSnapshot {
    this.ensureRunning('saveProjectToFile');
    return this.syncView(this.workbench.saveProjectToFile(path));
  }

  loadProjectFromFile(path: string): DesktopViewSnapshot {
    this.ensureRunning('loadProjectFromFile');
    return this.syncView(this.workbench.loadProjectFromFile(path), { bumpRenderRevision: true });
  }

  exportSvgToFile(path: string): DesktopViewSnapshot {
    this.ensureRunning('exportSvgToFile');
    return this.syncView(this.workbench.exportSvgToFile(path));
  }

  exportHtmlToFile(path: string): DesktopViewSnapshot {
    this.ensureRunning('exportHtmlToFile');
    return this.syncView(this.workbench.exportHtmlToFile(path));
  }

  exportPngToFile(path: string, dpi = 300): DesktopViewSnapshot {
    this.ensureRunning('exportPngToFile');
    return this.syncView(this.workbench.exportPngToFile(path, dpi));
  }

  suggestDefaultPngPath(): string | null {
    this.ensureRunning('suggestDefaultPngPath');
    return this.workbench.suggestDefaultPngPath();
  }

  getPreviewSvgContent(): string {
    this.ensureRunning('getPreviewSvgContent');
    return this.workbench.previewSvgContent();
  }

  renderWindowDocument(): string {
    this.ensureRunning('renderWindowDocument');
    return renderDesktopShellDocument({
      appTitle: this.bootstrap.appName,
      layout: createDefaultRendererLayout(),
      window: this.window,
      view: this.currentView,
      linkedStatus: this.getLinkedStatus(),
    });
  }

  buildReleaseBundle(outputDir: string): DesktopReleaseBundleArtifact {
    this.ensureRunning('buildReleaseBundle');
    const resolvedOutDir = resolve(outputDir);
    mkdirSync(resolvedOutDir, { recursive: true });
    copyFontPack(resolvedOutDir);
    const indexHtmlPath = join(resolvedOutDir, 'index.html');
    const manifestPath = join(resolvedOutDir, 'shell-manifest.json');
    const generatedAt = new Date().toISOString();

    const html = this.renderWindowDocument();
    writeFileSync(indexHtmlPath, html, 'utf8');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          productName: this.bootstrap.appName,
          generatedAt,
          entrypoint: 'index.html',
          supportsOffline: this.bootstrap.supportsOffline,
          supportsLocalFilesystem: this.bootstrap.supportsLocalFilesystem,
          window: this.window,
          layout: this.bootstrap.layout,
          fontPack: {
            directory: 'fonts',
          },
        },
        null,
        2
      ),
      'utf8'
    );

    return {
      outputDir: resolvedOutDir,
      indexHtmlPath,
      manifestPath,
      generatedAt,
      windowId: this.window.windowId,
      renderRevision: this.window.renderRevision,
    };
  }
}

export function createDesktopAppShell(): DesktopAppShell {
  return new DesktopAppShell();
}
