"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noOpRoundTrip = noOpRoundTrip;
const index_1 = require("../../../core-export-svg/dist/index");
const computeVisualEquivalence_1 = require("../visual/computeVisualEquivalence");
const retention_1 = require("../interaction/retention");
const reimportExportedArtifact_1 = require("./reimportExportedArtifact");
function collectDegradedObjectWarnings(project) {
    const warnings = new Set();
    for (const obj of Object.values(project.project.objects)) {
        if (obj.stability.exportStabilityClass !== 'stable') {
            warnings.add(`${obj.id}: exportStabilityClass=${obj.stability.exportStabilityClass}`);
        }
        if (obj.stability.reimportExpectation !== 'semantic') {
            warnings.add(`${obj.id}: reimportExpectation=${obj.stability.reimportExpectation}`);
        }
    }
    return [...warnings];
}
function computeStructureRetention(before, after) {
    const targetIds = new Set([
        ...before.project.figure.panels,
        ...before.project.figure.legends,
        ...before.project.figure.floatingObjects,
    ]);
    const missingObjectIds = [...targetIds].filter((id) => !after.project.objects[id]);
    return { pass: missingObjectIds.length === 0, missingObjectIds };
}
function noOpRoundTrip(project, source) {
    const svg = (0, index_1.exportSVG)(project);
    const reimport = (0, reimportExportedArtifact_1.reimportExportedArtifact)(svg, {
        ...source,
        kind: 'svg',
        path: source.path.endsWith('.svg') ? source.path : '/virtual/noop.svg',
    });
    const after = reimport.project;
    const structureRetention = computeStructureRetention(project, after);
    const degradedObjectWarnings = collectDegradedObjectWarnings(after);
    return {
        before: project,
        after,
        svgContent: svg.content,
        reimport,
        structureRetention,
        degradedObjectWarnings,
        visual: (0, computeVisualEquivalence_1.computeVisualEquivalence)(project, after, svg.content, svg.content),
        retention: (0, retention_1.computeInteractionRetention)(project, after),
    };
}
