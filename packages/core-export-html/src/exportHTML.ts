
import { FigureEditorError, Project } from '../../ir-schema/dist/index';
import { ExportArtifact } from '../../core-export-svg/dist/types';
import { serializeProjectToHtml } from './serializer/htmlSerializer';
import { buildHtmlExportReport } from './reports/buildHtmlExportReport';

export interface HtmlExportOptions {
  inlineStyles?: boolean;
}

export function exportHTML(project: Project, _options: HtmlExportOptions = {}): ExportArtifact {
  try {
    const content = serializeProjectToHtml(project);
    return {
      kind: 'html',
      artifactPath: '',
      content,
      warnings: [],
      stabilitySummary: buildHtmlExportReport(project),
    };
  } catch (error) {
    throw new FigureEditorError('ERR_EXPORT_FAILED', 'Failed to export HTML.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
