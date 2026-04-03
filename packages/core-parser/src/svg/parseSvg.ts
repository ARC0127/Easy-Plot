import { FileRef, ParsedDocument } from '../types';
import { parseXmlLike } from '../xmlLike';

export function parseSvg(input: FileRef): ParsedDocument {
  return parseXmlLike(input.content, 'svg');
}
