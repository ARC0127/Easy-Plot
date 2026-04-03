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
export declare class DesktopWorkbench {
    private state;
    private lastHit;
    private lastProjectPath;
    private importedSourcePath;
    private importedSourceKind;
    private hasProjectMutations;
    importDocument(input: DesktopImportInput): DesktopViewSnapshot;
    importFromFile(path: string, familyHint?: FamilyClass, htmlMode?: 'strict_static' | 'limited' | 'snapshot'): DesktopViewSnapshot;
    saveProjectToFile(path: string): DesktopViewSnapshot;
    loadProjectFromFile(path: string): DesktopViewSnapshot;
    exportSvgToFile(path: string): DesktopViewSnapshot;
    exportHtmlToFile(path: string): DesktopViewSnapshot;
    exportPngToFile(path: string, dpi?: number): DesktopViewSnapshot;
    suggestDefaultPngPath(): string | null;
    previewSvgContent(): string;
    selectById(objectId: string): DesktopViewSnapshot;
    selectFirstEditableText(): DesktopViewSnapshot;
    selectAtPoint(x: number, y: number): DesktopViewSnapshot;
    selectTextAtPoint(x: number, y: number, maxDistance?: number): DesktopViewSnapshot;
    moveSelected(dx: number, dy: number): DesktopViewSnapshot;
    adjustSelectedCurve(deltaY: number): DesktopViewSnapshot;
    adjustSelectedCurveHandle(handleId: string, dx: number, dy: number): DesktopViewSnapshot;
    multiSelectByIds(objectIds: string[]): DesktopViewSnapshot;
    editSelectedText(content: string): DesktopViewSnapshot;
    deleteSelected(): DesktopViewSnapshot;
    promoteSelection(role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason?: string): DesktopViewSnapshot;
    undo(): DesktopViewSnapshot;
    redo(): DesktopViewSnapshot;
    addTextAtPoint(x: number, y: number, content: string): DesktopViewSnapshot;
    linkedStatus(): DesktopLinkedStatus;
    hasLoadedProjectFile(): boolean;
    snapshot(): DesktopViewSnapshot;
}
export declare function createDesktopWorkbench(): DesktopWorkbench;
//# sourceMappingURL=workbench.d.ts.map