"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignCapabilities = assignCapabilities;
function withAllowedCapabilities(obj) {
    switch (obj.objectType) {
        case 'text_node':
            return obj.capabilities.filter(cap => obj.textKind === 'raw_text' ? ['select', 'multi_select', 'drag', 'delete', 'text_edit', 'style_edit'].includes(cap) : ['select', 'multi_select', 'drag', 'delete', 'group_only'].includes(cap));
        case 'image_node':
            return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'crop_only', 'replace_image', 'resize'].includes(cap));
        case 'shape_node':
            return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'style_edit'].includes(cap));
        case 'group_node':
            return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'group_only', 'promote_semantic_role', 'reparent'].includes(cap));
        case 'html_block':
            return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'resize', 'delete', 'text_edit', 'group_only'].includes(cap));
        case 'panel':
            return ['select', 'multi_select', 'drag', 'resize', 'delete', 'reparent'];
        case 'legend':
            return ['select', 'multi_select', 'drag', 'delete', 'reparent'];
        case 'annotation_block':
            return ['select', 'multi_select', 'drag', 'delete', 'reparent'];
        case 'figure_title':
        case 'panel_label':
            return ['select', 'multi_select', 'drag', 'delete', 'text_edit'];
        default:
            return [];
    }
}
function assignCapabilities(project) {
    const warnings = [];
    for (const obj of Object.values(project.project.objects)) {
        const next = withAllowedCapabilities(obj);
        if (next.length !== obj.capabilities.length) {
            warnings.push(`Capability set normalized for ${obj.id}.`);
            obj.capabilities = next;
        }
    }
    return { project, warnings };
}
