import type { BBox } from './geometry';
import type { DegradationReason, LiftConfidence, LiftedBy } from './enums';

export interface Provenance {
  originFileKind: 'native' | 'svg' | 'html';
  originSourceId: string | null;
  originNodeIds: string[];
  originSelectorOrPath: string | null;
  originBBox: BBox | null;
  originStyleSnapshot: Record<string, unknown>;
  liftedBy: LiftedBy;
  liftConfidence: LiftConfidence;
  degradationReason: DegradationReason;
}
