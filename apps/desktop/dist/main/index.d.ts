import type { FamilyClass } from '../../../../packages/ir-schema/dist/index';
import { DesktopAppearancePatch, DesktopImportInput, DesktopLinkedStatus, DesktopViewSnapshot } from '../renderer/workbench';
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
export declare function createDesktopBootstrap(): DesktopBootstrap;
export declare class DesktopAppShell {
    private readonly bootstrap;
    private readonly workbench;
    private window;
    private currentView;
    private ensureRunning;
    private syncView;
    getBootstrap(): DesktopBootstrap;
    getWindowSession(): DesktopWindowSession;
    launchWindow(): DesktopWindowSession;
    closeWindow(): DesktopWindowSession;
    getLinkedStatus(): DesktopLinkedStatus;
    snapshot(): DesktopViewSnapshot;
    importFromFile(path: string, familyHint?: FamilyClass, htmlMode?: DesktopHtmlMode): DesktopViewSnapshot;
    importDocument(input: DesktopImportInput): DesktopViewSnapshot;
    selectAtPoint(x: number, y: number, options?: {
        appendSelection?: boolean;
    }): DesktopViewSnapshot;
    selectTextAtPoint(x: number, y: number, maxDistance?: number): DesktopViewSnapshot;
    selectObject(objectId: string): DesktopViewSnapshot;
    multiSelectByIds(objectIds: string[]): DesktopViewSnapshot;
    clearSelection(): DesktopViewSnapshot;
    selectFirstEditableText(): DesktopViewSnapshot;
    copySelection(): DesktopViewSnapshot;
    pasteSelection(): DesktopViewSnapshot;
    moveSelected(dx: number, dy: number): DesktopViewSnapshot;
    adjustSelectedCurve(deltaY: number): DesktopViewSnapshot;
    adjustSelectedCurveHandle(handleId: string, dx: number, dy: number): DesktopViewSnapshot;
    editSelectedText(content: string): DesktopViewSnapshot;
    updateSelectedAppearance(patch: DesktopAppearancePatch): DesktopViewSnapshot;
    updateSelectedTextStyle(patch: DesktopAppearancePatch): DesktopViewSnapshot;
    addTextAtPoint(x: number, y: number, content: string): DesktopViewSnapshot;
    deleteSelected(): DesktopViewSnapshot;
    promoteSelection(role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason?: string): DesktopViewSnapshot;
    alignSelected(mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): DesktopViewSnapshot;
    distributeSelected(mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): DesktopViewSnapshot;
    undo(): DesktopViewSnapshot;
    redo(): DesktopViewSnapshot;
    saveProjectToFile(path: string): DesktopViewSnapshot;
    loadProjectFromFile(path: string): DesktopViewSnapshot;
    exportSvgToFile(path: string): DesktopViewSnapshot;
    exportHtmlToFile(path: string): DesktopViewSnapshot;
    exportPngToFile(path: string, dpi?: number): DesktopViewSnapshot;
    suggestDefaultPngPath(): string | null;
    getPreviewSvgContent(): string;
    renderWindowDocument(): string;
    buildReleaseBundle(outputDir: string): DesktopReleaseBundleArtifact;
}
export declare function createDesktopAppShell(): DesktopAppShell;
//# sourceMappingURL=index.d.ts.map