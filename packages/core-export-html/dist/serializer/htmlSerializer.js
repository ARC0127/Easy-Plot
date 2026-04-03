"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProjectToHtml = serializeProjectToHtml;
const svgSerializer_1 = require("../../../core-export-svg/dist/serializer/svgSerializer");
function serializeProjectToHtml(project) {
    const svg = (0, svgSerializer_1.serializeProjectToSvg)(project);
    const title = project.project.figure.metadata.title || 'Figure Export';
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>${title}</title></head><body><figure id="${project.project.figure.figureId}">${svg}<figcaption>${title}</figcaption></figure></body></html>`;
}
