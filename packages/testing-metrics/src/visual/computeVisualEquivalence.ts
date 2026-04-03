import { Project } from '../../../ir-schema/dist/index';
import { VisualEquivalenceReport } from '../reports/types';
import { computeRenderedRasterDiff } from './rasterDiff';
import { computeSemanticBBoxDiff } from './semanticBBoxDiff';

export function computeVisualEquivalence(beforeProject: Project, afterProject: Project, beforeMarkup: string, afterMarkup: string): VisualEquivalenceReport {
  const semantic = computeSemanticBBoxDiff(beforeProject, afterProject);
  const raster = computeRenderedRasterDiff(beforeMarkup, afterMarkup);
  return {
    pass: semantic.semanticBBoxPass && raster.rasterDiffPass,
    semanticBBoxPass: semantic.semanticBBoxPass,
    semanticBBoxViolations: semantic.semanticBBoxViolations,
    rasterDiffPass: raster.rasterDiffPass,
    normalizedPixelDiff: raster.normalizedPixelDiff,
    comparisonMode: raster.comparisonMode,
    warning: raster.warning,
  };
}
