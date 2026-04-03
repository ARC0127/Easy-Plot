"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseError = parseError;
const index_1 = require("../../ir-schema/dist/index");
function parseError(message, details) {
    return new index_1.FigureEditorError('ERR_PARSE_FAILED', message, details);
}
