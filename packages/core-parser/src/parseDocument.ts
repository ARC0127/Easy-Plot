import { FigureEditorError } from '../../ir-schema/dist/index';
import { FileRef, ParseOptions, ParsedDocument } from './types';
import { parseSvg } from './svg/parseSvg';
import { parseHtml } from './html/parseHtml';

function detectKindFromContent(content: string): 'svg' | 'html' | null {
  const trimmed = content.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith('<?xml') && trimmed.includes('<svg')) return 'svg';
  if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) return 'svg';
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || trimmed.includes('<body') || trimmed.includes('<div')) return 'html';
  return null;
}

export function parseDocument(input: FileRef, options: ParseOptions = {}): ParsedDocument {
  if (input.path.endsWith('.svg')) return parseSvg(input);
  if (input.path.endsWith('.html') || input.path.endsWith('.htm')) return parseHtml(input, options);
  const kind = detectKindFromContent(input.content);
  if (kind === 'svg') return parseSvg(input);
  if (kind === 'html') return parseHtml(input, options);
  throw new FigureEditorError('ERR_PARSE_FAILED', 'Unsupported file extension for parser.', { path: input.path });
}
