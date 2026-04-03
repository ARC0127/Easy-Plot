import { RendererLayout } from './layout';
import { DesktopLinkedStatus, DesktopViewSnapshot } from './workbench';
export interface DesktopShellWindowState {
    windowId: string;
    title: string;
    state: 'created' | 'running' | 'closed';
    openedAt: string | null;
    closedAt: string | null;
    renderRevision: number;
}
export interface DesktopShellRenderInput {
    appTitle: string;
    layout: RendererLayout;
    window: DesktopShellWindowState;
    view: DesktopViewSnapshot;
    linkedStatus: DesktopLinkedStatus;
}
export declare function renderDesktopShellDocument(input: DesktopShellRenderInput): string;
//# sourceMappingURL=shellDocument.d.ts.map