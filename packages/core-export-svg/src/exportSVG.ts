
import { FigureEditorError, Project } from '../../ir-schema/dist/index';
import { serializeProjectToSvg } from './serializer/svgSerializer';
import { buildSvgExportReport } from './reports/buildSvgExportReport';
import { ExportArtifact, SvgExportOptions } from './types';

export function exportSVG(project: Project, _options: SvgExportOptions = {}): ExportArtifact {
  try {
    const content = serializeProjectToSvg(project);
    return {
      kind: 'svg',
      artifactPath: '',
      content,
      warnings: [],
      stabilitySummary: buildSvgExportReport(project),
    };
  } catch (error) {
    throw new FigureEditorError('ERR_EXPORT_FAILED', 'Failed to export SVG.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
