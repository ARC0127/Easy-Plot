import { Project } from '../../ir-schema/dist/index';
export declare function dragObject(project: Project, objectId: string, dx: number, dy: number): Project;
export declare function resizeObject(project: Project, objectId: string, bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
}): Project;
export declare function editTextObject(project: Project, objectId: string, content: string): Project;
//# sourceMappingURL=interactions.d.ts.map