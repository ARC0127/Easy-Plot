import { ParsedDocument } from '../../core-parser/dist/index';
export interface NormalizedNode {
    nodeId: string;
    tagName: string;
    localTagName: string;
    namespacePrefix: string | null;
    namespaceUri: string | null;
    nodeKind: 'group' | 'text' | 'shape' | 'image' | 'html_block' | 'unknown';
    bbox: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    styles: Record<string, string>;
    transform: {
        raw: string | null;
        translate: [number, number] | null;
        scale: [number, number] | null;
        rotate: number | null;
        matrix: [number, number, number, number, number, number] | null;
    };
    textContent: string | null;
    children: string[];
    attributes: Record<string, string>;
}
export interface NormalizedDocument {
    kind: 'svg' | 'html';
    rootNodeId: string;
    nodes: Record<string, NormalizedNode>;
    original?: ParsedDocument;
    parseMetadata?: {
        htmlMode: 'strict_static' | 'limited' | 'snapshot';
        staticSubset: boolean;
        dynamicSignals: string[];
    };
}
//# sourceMappingURL=types.d.ts.map