import type { ObjectBase } from '../base';

export interface Panel extends ObjectBase {
  objectType: 'panel';
  label: string | null;
  titleObjectId: string | null;
  layoutRole: 'plot_panel' | 'image_panel' | 'table_panel' | 'composite_panel' | 'unknown';
  anchor: {
    kind: 'absolute' | 'figure_anchor';
    value: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | null;
  };
  offset: [number, number];
  contentRootId: string;
  childObjectIds: string[];
  axisHints: {
    hasXAxis: boolean;
    hasYAxis: boolean;
    hasColorbar: boolean;
    axisGroupIds: string[];
  };
}
