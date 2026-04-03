export interface Constraint {
  id: string;
  constraintType:
    | 'anchor_to_figure'
    | 'anchor_to_panel'
    | 'keep_inside_bounds'
    | 'align_left'
    | 'align_right'
    | 'align_top'
    | 'align_bottom'
    | 'center_horizontal'
    | 'center_vertical'
    | 'equal_spacing_horizontal'
    | 'equal_spacing_vertical'
    | 'lock_aspect_ratio'
    | 'snap_to_guides';
  subjectIds: string[];
  targetId: string | null;
  params: Record<string, unknown>;
}
