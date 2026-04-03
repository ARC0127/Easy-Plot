import type { ObjectBase } from '../base';
export interface GroupNode extends ObjectBase {
    objectType: 'group_node';
    childObjectIds: string[];
    semanticRoleHint: 'legend_candidate' | 'panel_candidate' | 'annotation_candidate' | 'generic_group' | 'unknown';
}
//# sourceMappingURL=groupNode.d.ts.map