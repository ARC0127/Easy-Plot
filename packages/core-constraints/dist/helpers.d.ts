import { AnyObject, Project } from '../../ir-schema/dist/index';
export declare function cloneProject(project: Project): Project;
export declare function getObject(project: Project, objectId: string): AnyObject;
export declare function getFigureBounds(project: Project): {
    x: number;
    y: number;
    w: number;
    h: number;
};
export declare function getPanelBounds(project: Project, panelId: string): {
    x: number;
    y: number;
    w: number;
    h: number;
};
export declare function pushConstraint(project: Project, constraintType: string, subjectIds: string[], targetId: string | null, params: Record<string, unknown>): void;
//# sourceMappingURL=helpers.d.ts.map