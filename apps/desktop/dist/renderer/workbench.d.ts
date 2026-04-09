import { buildLatestImportReport } from '../../../../packages/editor-import-report/dist/index';
import { buildPropertyViewModel } from '../../../../packages/editor-properties/dist/index';
import { buildTreeViewModel } from '../../../../packages/editor-tree/dist/index';
import type { FamilyClass } from '../../../../packages/ir-schema/dist/index';
export interface DesktopImportInput {
    path: string;
    content: string;
    kind: 'svg' | 'html';
    familyHint?: FamilyClass;
    htmlMode?: 'strict_static' | 'limited' | 'snapshot';
}
export interface DesktopCanvasView {
    selectedIds: string[];
    overlays: Array<{
        objectId: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    curveHandles: Array<{
        id: string;
        objectId: string;
        x: number;
        y: number;
        kind: string;
    }>;
    lastHit: {
        objectId: string;
        objectType: string;
    } | null;
}
export interface DesktopViewSnapshot {
    objectTree: ReturnType<typeof buildTreeViewModel>;
    canvas: DesktopCanvasView;
    properties: ReturnType<typeof buildPropertyViewModel>;
    importReport: ReturnType<typeof buildLatestImportReport>;
    warnings: string[];
}
export interface DesktopLinkedStatus {
    regionCount: number;
    treeNodeCount: number;
    selectedCount: number;
    overlayCount: number;
    hasProperties: boolean;
    hasImportReport: boolean;
    hasLoadedProjectFile: boolean;
}
export interface DesktopAppearancePatch {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fill?: string;
    stroke?: string;
}
export declare class DesktopWorkbench {
    private state;
    private lastHit;
    private lastProjectPath;
    private importedSourcePath;
    private importedSourceKind;
    private hasProjectMutations;
    private clipboard;
    private treeCacheProject;
    private treeCacheValue;
    private importReportCacheProject;
    private importReportCacheValue;
    private propertyCacheProject;
    private propertyCacheSelectionKey;
    private propertyCacheValue;
    private previewSvgCacheProject;
    private previewSvgCacheValue;
    private getCachedTreeView;
    private getCachedImportReport;
    private getCachedPropertyView;
    private getCachedPreviewSvg;
    importDocument(input: DesktopImportInput): DesktopViewSnapshot;
    importFromFile(path: string, familyHint?: FamilyClass, htmlMode?: 'strict_static' | 'limited' | 'snapshot'): DesktopViewSnapshot;
    saveProjectToFile(path: string): DesktopViewSnapshot;
    loadProjectFromFile(path: string): DesktopViewSnapshot;
    exportSvgToFile(path: string): DesktopViewSnapshot;
    exportHtmlToFile(path: string): DesktopViewSnapshot;
    exportPngToFile(path: string, dpi?: number): DesktopViewSnapshot;
    suggestDefaultPngPath(): string | null;
    previewSvgContent(): string;
    selectById(objectId: string, options?: {
        appendSelection?: boolean;
    }): DesktopViewSnapshot;
    selectFirstEditableText(): DesktopViewSnapshot;
    selectAtPoint(x: number, y: number, options?: {
        appendSelection?: boolean;
    }): DesktopViewSnapshot;
    selectTextAtPoint(x: number, y: number, maxDistance?: number): DesktopViewSnapshot;
    copySelection(): DesktopViewSnapshot;
    pasteSelection(): DesktopViewSnapshot;
    moveSelected(dx: number, dy: number): DesktopViewSnapshot;
    adjustSelectedCurve(deltaY: number): DesktopViewSnapshot;
    adjustSelectedCurveHandle(handleId: string, dx: number, dy: number): DesktopViewSnapshot;
    multiSelectByIds(objectIds: string[]): DesktopViewSnapshot;
    clearSelection(): DesktopViewSnapshot;
    editSelectedText(content: string): DesktopViewSnapshot;
    updateSelectedAppearance(patch: DesktopAppearancePatch): DesktopViewSnapshot;
    updateSelectedTextStyle(patch: DesktopAppearancePatch): DesktopViewSnapshot;
    updateDocumentFontFamily(fontFamily: string): DesktopViewSnapshot;
    deleteSelected(): DesktopViewSnapshot;
    promoteSelection(role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason?: string): DesktopViewSnapshot;
    alignSelected(mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): DesktopViewSnapshot;
    distributeSelected(mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): DesktopViewSnapshot;
    undo(): DesktopViewSnapshot;
    redo(): DesktopViewSnapshot;
    addTextAtPoint(x: number, y: number, content: string): DesktopViewSnapshot;
    linkedStatus(): DesktopLinkedStatus;
    hasLoadedProjectFile(): boolean;
    snapshot(): DesktopViewSnapshot;
}
export declare function createDesktopWorkbench(): DesktopWorkbench;
//# sourceMappingURL=workbench.d.ts.map