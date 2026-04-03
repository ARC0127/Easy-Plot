import { AnyObject, Project } from '../../ir-schema/dist/index';
export interface PropertyViewModel {
    id: string;
    objectType: string;
    name: string;
    bbox: AnyObject['bbox'];
    transform: AnyObject['transform'];
    capabilities: string[];
    provenance: AnyObject['provenance'];
    stability: AnyObject['stability'];
    extra: Record<string, unknown>;
}
export declare function buildPropertyViewModel(project: Project, objectId: string): PropertyViewModel | null;
//# sourceMappingURL=propertyViewModel.d.ts.map