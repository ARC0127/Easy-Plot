export const FIGURE_EDITOR_ERROR_CODES = [
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
] as const;

export type FigureEditorErrorCode = typeof FIGURE_EDITOR_ERROR_CODES[number];

export class FigureEditorError extends Error {
  public readonly code: FigureEditorErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: FigureEditorErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'FigureEditorError';
    this.code = code;
    this.details = details;
  }
}
