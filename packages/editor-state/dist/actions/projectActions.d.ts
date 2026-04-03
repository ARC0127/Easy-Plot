import { OriginalSourceRef, Project, validateProject } from '../../../ir-schema/dist/index';
export interface FigureInit {
    projectId?: string;
    figureId?: string;
    width?: number;
    height?: number;
    background?: string;
    title?: string;
}
export declare function createEmptyProject(init?: FigureInit): Project;
export declare function archiveOriginalSource(project: Project, source: OriginalSourceRef): Project;
export declare function validateProjectState(project: Project): ReturnType<typeof validateProject>;
export declare function saveProject(project: Project, path: string): void;
export declare function loadProject(path: string): Project;
//# sourceMappingURL=projectActions.d.ts.map