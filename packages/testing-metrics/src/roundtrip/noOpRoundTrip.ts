
import { OriginalSourceRef, Project } from '../../../ir-schema/dist/index';
import { exportSVG } from '../../../core-export-svg/dist/index';
import { computeVisualEquivalence } from '../visual/computeVisualEquivalence';
import { computeInteractionRetention } from '../interaction/retention';
import { reimportExportedArtifact } from './reimportExportedArtifact';

function collectDegradedObjectWarnings(project: Project): string[] {
  const warnings = new Set<string>();
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

function computeStructureRetention(before: Project, after: Project): { pass: boolean; missingObjectIds: string[] } {
  const targetIds = new Set([
    ...before.project.figure.panels,
    ...before.project.figure.legends,
    ...before.project.figure.floatingObjects,
  ]);
  const missingObjectIds = [...targetIds].filter((id) => !after.project.objects[id]);
  return { pass: missingObjectIds.length === 0, missingObjectIds };
}

export interface NoOpRoundTripReport {
  before: Project;
  after: Project;
  svgContent: string;
  reimport: ReturnType<typeof reimportExportedArtifact>;
  structureRetention: {
    pass: boolean;
    missingObjectIds: string[];
  };
  degradedObjectWarnings: string[];
  visual: ReturnType<typeof computeVisualEquivalence>;
  retention: ReturnType<typeof computeInteractionRetention>;
}

export function noOpRoundTrip(project: Project, source: OriginalSourceRef): NoOpRoundTripReport {
  const svg = exportSVG(project);
  const reimport = reimportExportedArtifact(svg, {
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
    visual: computeVisualEquivalence(project, after, svg.content, svg.content),
    retention: computeInteractionRetention(project, after),
  };
}
