export declare const FIGURE_EDITOR_ERROR_CODES: readonly ["ERR_PARSE_FAILED", "ERR_UNSUPPORTED_HTML_MODE", "ERR_DYNAMIC_HTML_NOT_SUPPORTED", "ERR_TEXT_EDIT_UNSUPPORTED", "ERR_OBJECT_NOT_FOUND", "ERR_SCHEMA_VALIDATION_FAILED", "ERR_EXPORT_FAILED", "ERR_REIMPORT_FAILED", "ERR_CAPABILITY_CONFLICT", "ERR_INVALID_MANUAL_PROMOTION"];
export type FigureEditorErrorCode = typeof FIGURE_EDITOR_ERROR_CODES[number];
export declare class FigureEditorError extends Error {
    readonly code: FigureEditorErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: FigureEditorErrorCode, message?: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map