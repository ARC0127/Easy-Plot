export interface FileRef {
    path: string;
    content: string;
}
export type HtmlImportMode = 'strict_static' | 'limited' | 'snapshot';
export interface ParseOptions {
    htmlMode?: HtmlImportMode;
}
export interface ParsedNode {
    nodeId: string;
    tagName: string;
    localTagName: string;
    namespacePrefix: string | null;
    namespaceUri: string | null;
    attributes: Record<string, string>;
    children: string[];
    parentNodeId: string | null;
    textContent: string | null;
}
export interface ParsedDocument {
    kind: 'svg' | 'html';
    rootNodeId: string;
    nodes: Record<string, ParsedNode>;
    originalText?: string;
    parseMetadata?: {
        htmlMode: HtmlImportMode;
        staticSubset: boolean;
        dynamicSignals: string[];
    };
}
//# sourceMappingURL=types.d.ts.map