"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeVisualEquivalence = computeVisualEquivalence;
const rasterDiff_1 = require("./rasterDiff");
const semanticBBoxDiff_1 = require("./semanticBBoxDiff");
function computeVisualEquivalence(beforeProject, afterProject, beforeMarkup, afterMarkup) {
    const semantic = (0, semanticBBoxDiff_1.computeSemanticBBoxDiff)(beforeProject, afterProject);
    const raster = (0, rasterDiff_1.computeRenderedRasterDiff)(beforeMarkup, afterMarkup);
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
