"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopAppShell = void 0;
exports.createDesktopBootstrap = createDesktopBootstrap;
exports.createDesktopAppShell = createDesktopAppShell;
const fs_1 = require("fs");
const path_1 = require("path");
const layout_1 = require("../renderer/layout");
const shellDocument_1 = require("../renderer/shellDocument");
const workbench_1 = require("../renderer/workbench");
function createWindowSession(state) {
    return {
        windowId: `desktop_window_${Date.now()}`,
        title: 'Easy Plot',
        state,
        openedAt: null,
        closedAt: null,
        renderRevision: 0,
    };
}
function createDesktopBootstrap() {
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
class DesktopAppShell {
    bootstrap = createDesktopBootstrap();
    workbench = (0, workbench_1.createDesktopWorkbench)();
    window = createWindowSession('created');
    currentView = this.workbench.snapshot();
    ensureRunning(action) {
        if (this.window.state !== 'running') {
            throw new Error(`Desktop window is not running; cannot execute ${action}.`);
        }
    }
    syncView(view, options) {
        this.currentView = view;
        if (this.window.state === 'running' && options?.bumpRenderRevision === true) {
            this.window.renderRevision += 1;
        }
        return view;
    }
    getBootstrap() {
        return { ...this.bootstrap, layout: this.bootstrap.layout.map((region) => ({ ...region })) };
    }
    getWindowSession() {
        return { ...this.window };
    }
    launchWindow() {
        if (this.window.state === 'running')
            return this.getWindowSession();
        if (this.window.state === 'closed') {
            this.window = createWindowSession('created');
            this.currentView = this.workbench.snapshot();
        }
        this.window.state = 'running';
        this.window.openedAt = new Date().toISOString();
        this.window.closedAt = null;
        return this.getWindowSession();
    }
    closeWindow() {
        if (this.window.state !== 'running')
            return this.getWindowSession();
        this.window.state = 'closed';
        this.window.closedAt = new Date().toISOString();
        return this.getWindowSession();
    }
    getLinkedStatus() {
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
    snapshot() {
        this.ensureRunning('snapshot');
        return this.currentView;
    }
    importFromFile(path, familyHint = 'unknown', htmlMode = 'limited') {
        this.ensureRunning('importFromFile');
        return this.syncView(this.workbench.importFromFile(path, familyHint, htmlMode), { bumpRenderRevision: true });
    }
    importDocument(input) {
        this.ensureRunning('importDocument');
        return this.syncView(this.workbench.importDocument(input), { bumpRenderRevision: true });
    }
    selectAtPoint(x, y) {
        this.ensureRunning('selectAtPoint');
        return this.syncView(this.workbench.selectAtPoint(x, y));
    }
    selectTextAtPoint(x, y, maxDistance = 32) {
        this.ensureRunning('selectTextAtPoint');
        return this.syncView(this.workbench.selectTextAtPoint(x, y, maxDistance));
    }
    selectObject(objectId) {
        this.ensureRunning('selectObject');
        return this.syncView(this.workbench.selectById(objectId));
    }
    selectFirstEditableText() {
        this.ensureRunning('selectFirstEditableText');
        return this.syncView(this.workbench.selectFirstEditableText());
    }
    moveSelected(dx, dy) {
        this.ensureRunning('moveSelected');
        return this.syncView(this.workbench.moveSelected(dx, dy), { bumpRenderRevision: true });
    }
    adjustSelectedCurve(deltaY) {
        this.ensureRunning('adjustSelectedCurve');
        return this.syncView(this.workbench.adjustSelectedCurve(deltaY), { bumpRenderRevision: true });
    }
    adjustSelectedCurveHandle(handleId, dx, dy) {
        this.ensureRunning('adjustSelectedCurveHandle');
        return this.syncView(this.workbench.adjustSelectedCurveHandle(handleId, dx, dy), { bumpRenderRevision: true });
    }
    editSelectedText(content) {
        this.ensureRunning('editSelectedText');
        return this.syncView(this.workbench.editSelectedText(content), { bumpRenderRevision: true });
    }
    addTextAtPoint(x, y, content) {
        this.ensureRunning('addTextAtPoint');
        return this.syncView(this.workbench.addTextAtPoint(x, y, content), { bumpRenderRevision: true });
    }
    deleteSelected() {
        this.ensureRunning('deleteSelected');
        return this.syncView(this.workbench.deleteSelected(), { bumpRenderRevision: true });
    }
    promoteSelection(role, reason = 'desktop_shell_promote') {
        this.ensureRunning('promoteSelection');
        return this.syncView(this.workbench.promoteSelection(role, reason), { bumpRenderRevision: true });
    }
    undo() {
        this.ensureRunning('undo');
        return this.syncView(this.workbench.undo(), { bumpRenderRevision: true });
    }
    redo() {
        this.ensureRunning('redo');
        return this.syncView(this.workbench.redo(), { bumpRenderRevision: true });
    }
    saveProjectToFile(path) {
        this.ensureRunning('saveProjectToFile');
        return this.syncView(this.workbench.saveProjectToFile(path));
    }
    loadProjectFromFile(path) {
        this.ensureRunning('loadProjectFromFile');
        return this.syncView(this.workbench.loadProjectFromFile(path), { bumpRenderRevision: true });
    }
    exportSvgToFile(path) {
        this.ensureRunning('exportSvgToFile');
        return this.syncView(this.workbench.exportSvgToFile(path));
    }
    exportHtmlToFile(path) {
        this.ensureRunning('exportHtmlToFile');
        return this.syncView(this.workbench.exportHtmlToFile(path));
    }
    exportPngToFile(path, dpi = 300) {
        this.ensureRunning('exportPngToFile');
        return this.syncView(this.workbench.exportPngToFile(path, dpi));
    }
    suggestDefaultPngPath() {
        this.ensureRunning('suggestDefaultPngPath');
        return this.workbench.suggestDefaultPngPath();
    }
    getPreviewSvgContent() {
        this.ensureRunning('getPreviewSvgContent');
        return this.workbench.previewSvgContent();
    }
    renderWindowDocument() {
        this.ensureRunning('renderWindowDocument');
        return (0, shellDocument_1.renderDesktopShellDocument)({
            appTitle: this.bootstrap.appName,
            layout: (0, layout_1.createDefaultRendererLayout)(),
            window: this.window,
            view: this.currentView,
            linkedStatus: this.getLinkedStatus(),
        });
    }
    buildReleaseBundle(outputDir) {
        this.ensureRunning('buildReleaseBundle');
        const resolvedOutDir = (0, path_1.resolve)(outputDir);
        (0, fs_1.mkdirSync)(resolvedOutDir, { recursive: true });
        const indexHtmlPath = (0, path_1.join)(resolvedOutDir, 'index.html');
        const manifestPath = (0, path_1.join)(resolvedOutDir, 'shell-manifest.json');
        const generatedAt = new Date().toISOString();
        const html = this.renderWindowDocument();
        (0, fs_1.writeFileSync)(indexHtmlPath, html, 'utf8');
        (0, fs_1.writeFileSync)(manifestPath, JSON.stringify({
            productName: this.bootstrap.appName,
            generatedAt,
            entrypoint: 'index.html',
            supportsOffline: this.bootstrap.supportsOffline,
            supportsLocalFilesystem: this.bootstrap.supportsLocalFilesystem,
            window: this.window,
            layout: this.bootstrap.layout,
        }, null, 2), 'utf8');
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
exports.DesktopAppShell = DesktopAppShell;
function createDesktopAppShell() {
    return new DesktopAppShell();
}
