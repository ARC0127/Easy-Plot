"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCapabilityConflicts = validateCapabilityConflicts;
const ALLOWED_CAPABILITIES = {
    panel: ['select', 'multi_select', 'drag', 'resize', 'delete', 'reparent'],
    legend: ['select', 'multi_select', 'drag', 'delete', 'reparent'],
    annotation_block: ['select', 'multi_select', 'drag', 'delete', 'reparent'],
    text_node: ['select', 'multi_select', 'drag', 'delete', 'text_edit', 'style_edit', 'group_only'],
    image_node: ['select', 'multi_select', 'drag', 'delete', 'crop_only', 'replace_image', 'resize'],
    shape_node: ['select', 'multi_select', 'drag', 'delete', 'style_edit'],
    group_node: ['select', 'multi_select', 'drag', 'delete', 'group_only', 'promote_semantic_role', 'reparent'],
    html_block: ['select', 'multi_select', 'drag', 'resize', 'delete', 'text_edit', 'group_only'],
    figure_title: ['select', 'multi_select', 'drag', 'delete', 'text_edit'],
    panel_label: ['select', 'multi_select', 'drag', 'delete', 'text_edit'],
};
function validateCapabilityConflicts(project) {
    const issues = [];
    const objects = Object.values(project.project.objects);
    for (const obj of objects) {
        if (obj.capabilities.includes('text_edit') && obj.capabilities.includes('group_only')) {
            issues.push({
                code: 'CAP_CONFLICT_TEXT_EDIT_AND_GROUP_ONLY',
                objectId: obj.id,
                message: 'Object cannot be both text_edit and group_only.',
            });
        }
        if (obj.capabilities.includes('crop_only') && obj.objectType !== 'image_node') {
            issues.push({
                code: 'CAP_CONFLICT_CROP_ONLY_NON_IMAGE',
                objectId: obj.id,
                message: 'crop_only should only appear on image-like objects.',
            });
        }
        const allowed = new Set(ALLOWED_CAPABILITIES[obj.objectType]);
        for (const capability of obj.capabilities) {
            if (!allowed.has(capability)) {
                issues.push({
                    code: 'CAP_ILLEGAL_FOR_OBJECT_TYPE',
                    objectId: obj.id,
                    message: `Capability ${capability} is illegal for objectType ${obj.objectType}.`,
                });
            }
        }
    }
    return issues;
}
