import { RendererLayout } from './layout';
export * from './workbench';
export * from './shellDocument';
export interface RendererBootstrap {
    appTitle: string;
    layout: RendererLayout;
}
export declare function createRendererBootstrap(): RendererBootstrap;
//# sourceMappingURL=index.d.ts.map