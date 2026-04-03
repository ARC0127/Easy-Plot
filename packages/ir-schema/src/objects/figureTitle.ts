import type { ObjectBase } from '../base';

interface AnchoredTitleBase extends ObjectBase {
  textObjectId: string;
  anchor: {
    kind: 'figure_anchor' | 'panel_anchor' | 'free';
    value: 'top_center' | 'top_left' | 'top_right' | null;
    targetPanelId: string | null;
  };
  offset: [number, number];
}

export interface FigureTitle extends AnchoredTitleBase {
  objectType: 'figure_title';
}

export interface PanelLabel extends AnchoredTitleBase {
  objectType: 'panel_label';
}
