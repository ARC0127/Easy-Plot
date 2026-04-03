import { EquivalenceTarget, ReimportExpectation, StabilityProfile } from '../../ir-schema/dist/index';

export function makeStabilityProfile(kind: 'semantic' | 'group_only' | 'atomic', eq: EquivalenceTarget = 'EQ-L2'): StabilityProfile {
  const reimportExpectation: ReimportExpectation = kind === 'semantic' ? 'semantic' : kind === 'group_only' ? 'group_only' : 'atomic';
  return {
    exportStabilityClass: kind === 'atomic' ? 'fragile' : 'stable',
    requiresSnapshotRendering: false,
    reimportExpectation,
    equivalenceTarget: eq,
  };
}
