import { AnyObject, CapabilityFlag, Project } from '../../ir-schema/dist/index';

function withAllowedCapabilities(obj: AnyObject): CapabilityFlag[] {
  switch (obj.objectType) {
    case 'text_node':
      return obj.capabilities.filter(cap => obj.textKind === 'raw_text' ? ['select', 'multi_select', 'drag', 'delete', 'text_edit', 'style_edit'].includes(cap) : ['select', 'multi_select', 'drag', 'delete', 'group_only'].includes(cap)) as CapabilityFlag[];
    case 'image_node':
      return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'crop_only', 'replace_image', 'resize'].includes(cap)) as CapabilityFlag[];
    case 'shape_node':
      return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'style_edit'].includes(cap)) as CapabilityFlag[];
    case 'group_node':
      return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'delete', 'group_only', 'promote_semantic_role', 'reparent'].includes(cap)) as CapabilityFlag[];
    case 'html_block':
      return obj.capabilities.filter(cap => ['select', 'multi_select', 'drag', 'resize', 'delete', 'text_edit', 'group_only'].includes(cap)) as CapabilityFlag[];
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

export interface CapabilityResult {
  project: Project;
  warnings: string[];
}

export function assignCapabilities(project: Project): CapabilityResult {
  const warnings: string[] = [];
  for (const obj of Object.values(project.project.objects) as AnyObject[]) {
    const next = withAllowedCapabilities(obj);
    if (next.length !== obj.capabilities.length) {
      warnings.push(`Capability set normalized for ${obj.id}.`);
      obj.capabilities = next;
    }
  }
  return { project, warnings };
}
