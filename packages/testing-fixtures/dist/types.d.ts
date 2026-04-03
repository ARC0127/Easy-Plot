import { FamilyClass } from '../../ir-schema/dist/index';
export interface FixtureRecord {
    fixtureId: string;
    family: FamilyClass;
    kind: 'svg' | 'html';
    path: string;
    groundTruthPath: string;
    notes: string;
}
export interface FixtureGroundTruth {
    fixtureId: string;
    family: Exclude<FamilyClass, 'unknown'>;
    hasLegend: boolean;
    panelIds: string[];
    editableRawTextIds: string[];
    atomicRasterIds: string[];
    expectedCapabilities: Record<string, string[]>;
}
//# sourceMappingURL=types.d.ts.map