import type { FamilyClass, SourceKind, SourceMode } from './enums';
import type { Constraint } from './constraints';
import type { Panel } from './objects/panel';
import type { Legend } from './objects/legend';
import type { AnnotationBlock } from './objects/annotation';
import type { TextNode } from './objects/textNode';
import type { ImageNode } from './objects/imageNode';
import type { ShapeNode } from './objects/shapeNode';
import type { GroupNode } from './objects/groupNode';
import type { HtmlBlock } from './objects/htmlBlock';
import type { FigureTitle, PanelLabel } from './objects/figureTitle';
export interface OriginalSourceRef {
    sourceId: string;
    kind: SourceKind;
    path: string;
    sha256: string;
    familyHint: FamilyClass;
    importedAt: string;
}
export interface Figure {
    figureId: string;
    width: number;
    height: number;
    viewBox: [number, number, number, number];
    background: string;
    panels: string[];
    legends: string[];
    floatingObjects: string[];
    renderTreeRootId: string;
    constraints: Constraint[];
    metadata: {
        title: string;
        description: string;
        tags: string[];
    };
}
export interface ImportRecord {
    importId: string;
    sourceId: string;
    familyClassifiedAs: FamilyClass;
    liftSuccesses: Record<string, unknown>[];
    liftFailures: Record<string, unknown>[];
    unknownObjects: string[];
    atomicRasterObjects: string[];
    manualAttentionRequired: string[];
    metrics: {
        rawNodeCount: number;
        liftedSemanticObjectCount: number;
        textEditableCount: number;
        atomicRasterCount: number;
    };
}
export interface HistoryState {
    undoStack: Record<string, unknown>[];
    redoStack: Record<string, unknown>[];
    operationLog: Record<string, unknown>[];
}
export interface ExportPolicy {
    defaultExportKind: 'svg' | 'html';
    svg: {
        preferTextNode: boolean;
        flattenFragileObjects: boolean;
        embedImages: boolean;
    };
    html: {
        mode: 'inline_svg_preferred';
        inlineStyles: boolean;
        externalCSS: boolean;
    };
}
export type AnyObject = Panel | Legend | AnnotationBlock | TextNode | ImageNode | ShapeNode | GroupNode | HtmlBlock | FigureTitle | PanelLabel;
export interface Project {
    schemaVersion: '1.0.0-mvp';
    project: {
        projectId: string;
        createdAt: string;
        updatedAt: string;
        sourceMode: SourceMode;
        originalSources: OriginalSourceRef[];
        figure: Figure;
        importRecords: ImportRecord[];
        history: HistoryState;
        exportPolicy: ExportPolicy;
        objects: Record<string, AnyObject>;
    };
}
//# sourceMappingURL=project.d.ts.map