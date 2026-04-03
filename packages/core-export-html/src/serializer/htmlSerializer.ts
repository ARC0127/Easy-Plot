
import { Project } from '../../../ir-schema/dist/index';
import { serializeProjectToSvg } from '../../../core-export-svg/dist/serializer/svgSerializer';

export function serializeProjectToHtml(project: Project): string {
  const svg = serializeProjectToSvg(project);
  const title = project.project.figure.metadata.title || 'Figure Export';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>${title}</title></head><body><figure id="${project.project.figure.figureId}">${svg}<figcaption>${title}</figcaption></figure></body></html>`;
}
