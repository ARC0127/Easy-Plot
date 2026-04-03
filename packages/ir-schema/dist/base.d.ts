import type { CapabilityFlag, ObjectType } from './enums';
import type { BBox, Transform2D } from './geometry';
import type { Provenance } from './provenance';
import type { StabilityProfile } from './stability';
export interface ManualEditRecord {
    editId: string;
    kind: 'manual_promote' | 'manual_role_override' | 'manual_group' | 'manual_ungroup' | 'manual_anchor_change' | 'manual_capability_override';
    timestamp: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
}
export interface ObjectBase {
    id: string;
    objectType: ObjectType;
    name: string;
    visible: boolean;
    locked: boolean;
    zIndex: number;
    bbox: BBox;
    transform: Transform2D;
    styleRef: string | null;
    capabilities: CapabilityFlag[];
    provenance: Provenance;
    stability: StabilityProfile;
    manualEdits: ManualEditRecord[];
}
//# sourceMappingURL=base.d.ts.map