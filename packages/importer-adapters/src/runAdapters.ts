import { NormalizedDocument } from '../../core-normalizer/dist/index';
import { FamilyClass } from '../../ir-schema/dist/index';
import { detectChartFamilyHints } from './chart-family';
import { detectDegradedSvgHints } from './degraded-svg';
import { detectIllustrationLikeHints } from './illustration-like';
import { detectLlmSvgHints } from './llm-svg';
import { detectMatplotlibHints } from './matplotlib';
import { detectStaticHtmlInlineSvgHints } from './static-html-inline-svg';
import { AdapterHints } from './types';

export function runAdapters(normalized: NormalizedDocument, family: FamilyClass): AdapterHints {
  let hints = [] as AdapterHints['hints'];
  switch (family) {
    case 'matplotlib':
      hints = detectMatplotlibHints(normalized);
      break;
    case 'chart_family':
      hints = detectChartFamilyHints(normalized);
      break;
    case 'illustration_like':
      hints = detectIllustrationLikeHints(normalized);
      break;
    case 'llm_svg':
      hints = detectLlmSvgHints(normalized);
      break;
    case 'static_html_inline_svg':
      hints = detectStaticHtmlInlineSvgHints(normalized);
      break;
    case 'degraded_svg':
      hints = detectDegradedSvgHints(normalized);
      break;
    default:
      hints = [];
  }
  return { family, hints, evidence: hints.flatMap(h => h.evidence) };
}
