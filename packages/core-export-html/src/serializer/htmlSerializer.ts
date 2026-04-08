
import { Project } from '../../../ir-schema/dist/index';
import { serializeProjectToSvg } from '../../../core-export-svg/dist/serializer/svgSerializer';
const { buildFontFaceCss, getBundledFontStackPresets } = require('../../../../scripts/font_pack.cjs');

export function serializeProjectToHtml(project: Project): string {
  const svg = serializeProjectToSvg(project);
  const title = project.project.figure.metadata.title || 'Figure Export';
  const fontFaceCss = buildFontFaceCss('fonts');
  const fontStacks = getBundledFontStackPresets();
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>${title}</title><style>${fontFaceCss}</style><style>body{font-family:${fontStacks.sans};margin:0;background:#fff;color:#111827;}figure{margin:0;padding:16px;}</style></head><body><figure id="${project.project.figure.figureId}">${svg}<figcaption>${title}</figcaption></figure></body></html>`;
}
