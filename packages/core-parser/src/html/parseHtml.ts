import { FigureEditorError } from '../../../ir-schema/dist/index';
import { FileRef, HtmlImportMode, ParseOptions, ParsedDocument } from '../types';
import { parseXmlLike } from '../xmlLike';

const HTML_MODES: ReadonlySet<HtmlImportMode> = new Set(['strict_static', 'limited', 'snapshot']);

function detectDynamicSignals(parsed: ParsedDocument): string[] {
  const signals = new Set<string>();
  for (const node of Object.values(parsed.nodes)) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'script') signals.add('script_tag');
    if (tag === 'template') signals.add('template_tag');
    if (node.attributes['data-reactroot'] !== undefined || node.attributes['ng-version'] !== undefined || node.attributes['data-v-app'] !== undefined) {
      signals.add('framework_hydration_marker');
    }

    for (const [key, value] of Object.entries(node.attributes)) {
      const attr = key.toLowerCase();
      if (attr.startsWith('on')) signals.add(`event_handler:${attr}`);
      if ((attr === 'src' || attr === 'href') && /\.js(\?|$)/i.test(value)) signals.add('external_script_reference');
      if (value.includes('{{') || value.includes('}}')) signals.add('template_expression');
    }
  }
  return [...signals];
}

export function parseHtml(input: FileRef, options: ParseOptions = {}): ParsedDocument {
  const htmlMode = options.htmlMode ?? 'strict_static';
  if (!HTML_MODES.has(htmlMode)) {
    throw new FigureEditorError('ERR_UNSUPPORTED_HTML_MODE', `Unsupported html parse mode: ${String(options.htmlMode)}`, {
      htmlMode: options.htmlMode,
      supportedModes: [...HTML_MODES],
    });
  }

  const parsed = parseXmlLike(input.content, 'html');
  const dynamicSignals = detectDynamicSignals(parsed);
  const staticSubset = dynamicSignals.length === 0;

  if (!staticSubset && htmlMode === 'strict_static') {
    throw new FigureEditorError('ERR_DYNAMIC_HTML_NOT_SUPPORTED', 'Detected dynamic HTML signals that require limited/snapshot mode.', {
      path: input.path,
      dynamicSignals,
    });
  }

  return {
    ...parsed,
    parseMetadata: {
      htmlMode,
      staticSubset,
      dynamicSignals,
    },
  };
}
