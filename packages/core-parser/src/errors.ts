import { FigureEditorError } from '../../ir-schema/dist/index';

export function parseError(message: string, details?: Record<string, unknown>): FigureEditorError {
  return new FigureEditorError('ERR_PARSE_FAILED', message, details);
}
