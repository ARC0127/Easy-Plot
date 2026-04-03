"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FigureEditorError = exports.FIGURE_EDITOR_ERROR_CODES = void 0;
exports.FIGURE_EDITOR_ERROR_CODES = [
    'ERR_PARSE_FAILED',
    'ERR_UNSUPPORTED_HTML_MODE',
    'ERR_DYNAMIC_HTML_NOT_SUPPORTED',
    'ERR_TEXT_EDIT_UNSUPPORTED',
    'ERR_OBJECT_NOT_FOUND',
    'ERR_SCHEMA_VALIDATION_FAILED',
    'ERR_EXPORT_FAILED',
    'ERR_REIMPORT_FAILED',
    'ERR_CAPABILITY_CONFLICT',
    'ERR_INVALID_MANUAL_PROMOTION'
];
class FigureEditorError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message ?? code);
        this.name = 'FigureEditorError';
        this.code = code;
        this.details = details;
    }
}
exports.FigureEditorError = FigureEditorError;
