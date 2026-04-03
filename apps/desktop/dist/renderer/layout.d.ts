export interface RendererPanel {
    key: string;
    label: string;
    minWidth: number;
    minHeight: number;
}
export interface RendererLayout {
    left: RendererPanel[];
    center: RendererPanel[];
    right: RendererPanel[];
    bottom: RendererPanel[];
}
export declare function createDefaultRendererLayout(): RendererLayout;
//# sourceMappingURL=layout.d.ts.map