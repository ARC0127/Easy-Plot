import type { ObjectBase } from '../base';
export interface Legend extends ObjectBase {
    objectType: 'legend';
    itemObjectIds: string[];
    anchor: {
        kind: 'figure_anchor' | 'panel_anchor' | 'free';
        value: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left' | 'center' | null;
        targetPanelId: string | null;
    };
    offset: [number, number];
    orientation: 'vertical' | 'horizontal' | 'auto';
    floating: boolean;
}
//# sourceMappingURL=legend.d.ts.map