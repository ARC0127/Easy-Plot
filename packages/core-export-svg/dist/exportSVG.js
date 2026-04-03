"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSVG = exportSVG;
const index_1 = require("../../ir-schema/dist/index");
const svgSerializer_1 = require("./serializer/svgSerializer");
const buildSvgExportReport_1 = require("./reports/buildSvgExportReport");
function exportSVG(project, _options = {}) {
    try {
        const content = (0, svgSerializer_1.serializeProjectToSvg)(project);
        return {
            kind: 'svg',
            artifactPath: '',
            content,
            warnings: [],
            stabilitySummary: (0, buildSvgExportReport_1.buildSvgExportReport)(project),
        };
    }
    catch (error) {
        throw new index_1.FigureEditorError('ERR_EXPORT_FAILED', 'Failed to export SVG.', {
            cause: error instanceof Error ? error.message : String(error),
        });
    }
}
