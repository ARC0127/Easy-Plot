"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportHTML = exportHTML;
const index_1 = require("../../ir-schema/dist/index");
const htmlSerializer_1 = require("./serializer/htmlSerializer");
const buildHtmlExportReport_1 = require("./reports/buildHtmlExportReport");
function exportHTML(project, _options = {}) {
    try {
        const content = (0, htmlSerializer_1.serializeProjectToHtml)(project);
        return {
            kind: 'html',
            artifactPath: '',
            content,
            warnings: [],
            stabilitySummary: (0, buildHtmlExportReport_1.buildHtmlExportReport)(project),
        };
    }
    catch (error) {
        throw new index_1.FigureEditorError('ERR_EXPORT_FAILED', 'Failed to export HTML.', {
            cause: error instanceof Error ? error.message : String(error),
        });
    }
}
