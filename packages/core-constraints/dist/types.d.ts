import { Constraint, Project } from '../../ir-schema/dist/index';
export type AlignmentMode = 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical';
export type DistributeMode = 'equal_spacing_horizontal' | 'equal_spacing_vertical';
export interface AnchorSpec {
    kind: 'figure_anchor' | 'panel_anchor' | 'free' | 'absolute';
    value: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center' | 'top_center' | null;
    targetPanelId?: string | null;
}
export interface GuideLine {
    id: string;
    orientation: 'vertical' | 'horizontal';
    position: number;
    sourceObjectId?: string;
}
export interface SnapResult {
    x: number;
    y: number;
    snappedX: boolean;
    snappedY: boolean;
    guideIds: string[];
}
export interface ConstraintMutationResult {
    project: Project;
    appliedConstraint: Constraint | null;
}
//# sourceMappingURL=types.d.ts.map