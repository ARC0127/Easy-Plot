"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProjectToHtml = serializeProjectToHtml;
const svgSerializer_1 = require("../../../core-export-svg/dist/serializer/svgSerializer");
const { buildFontFaceCss, getBundledFontStackPresets } = require('../../../../scripts/font_pack.cjs');
function serializeProjectToHtml(project) {
    const svg = (0, svgSerializer_1.serializeProjectToSvg)(project);
    const title = project.project.figure.metadata.title || 'Figure Export';
    const fontFaceCss = buildFontFaceCss('fonts');
    const fontStacks = getBundledFontStackPresets();
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>${title}</title><style>${fontFaceCss}</style><style>body{font-family:${fontStacks.sans};margin:0;background:#fff;color:#111827;}figure{margin:0;padding:16px;}</style></head><body><figure id="${project.project.figure.figureId}">${svg}<figcaption>${title}</figcaption></figure></body></html>`;
}
