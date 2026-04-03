import { FamilyClass } from '../../ir-schema/dist/index';
export interface AdapterEvidence {
    adapter: string;
    confidence: 'high' | 'medium' | 'low';
    nodeIds: string[];
    reasons: string[];
}
export interface AdapterHint {
    kind: 'panel_candidate' | 'legend_candidate' | 'annotation_candidate' | 'title_candidate' | 'text_block_candidate';
    nodeIds: string[];
    confidence: 'high' | 'medium' | 'low';
    evidence: AdapterEvidence[];
}
export interface AdapterHints {
    family: FamilyClass;
    hints: AdapterHint[];
    evidence: AdapterEvidence[];
}
//# sourceMappingURL=types.d.ts.map