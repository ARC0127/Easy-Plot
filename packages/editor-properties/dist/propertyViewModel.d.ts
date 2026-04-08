import { AnyObject, Project } from '../../ir-schema/dist/index';
export interface TextStyleViewModel {
    targetObjectId: string;
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    fill: string;
}
export interface AppearanceViewModel {
    targetObjectIds: string[];
    fillTargetCount: number;
    strokeTargetCount: number;
    fillColor: string | null;
    strokeColor: string | null;
}
export interface PropertyViewModel {
    id: string;
    objectType: string;
    name: string;
    bbox: AnyObject['bbox'];
    transform: AnyObject['transform'];
    capabilities: string[];
    provenance: AnyObject['provenance'];
    stability: AnyObject['stability'];
    textStyle: TextStyleViewModel | null;
    appearance: AppearanceViewModel | null;
    extra: Record<string, unknown>;
}
export declare function buildPropertyViewModel(project: Project, objectId: string): PropertyViewModel | null;
//# sourceMappingURL=propertyViewModel.d.ts.map