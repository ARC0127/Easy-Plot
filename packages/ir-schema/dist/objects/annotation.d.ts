import type { ObjectBase } from '../base';
export interface AnnotationBlock extends ObjectBase {
    objectType: 'annotation_block';
    purpose: 'callout' | 'arrow_note' | 'highlight' | 'generic_note';
    childObjectIds: string[];
    anchor: {
        kind: 'panel_anchor' | 'free';
        value: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center' | null;
        targetPanelId: string | null;
    };
    offset: [number, number];
}
//# sourceMappingURL=annotation.d.ts.map