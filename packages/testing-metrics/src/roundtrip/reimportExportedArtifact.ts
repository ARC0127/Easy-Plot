import { ExportArtifact } from '../../../core-export-svg/dist/types';
import { assignCapabilities } from '../../../core-capability/dist/index';
import { liftToIR } from '../../../core-lifter/dist/index';
import { normalizeDocument } from '../../../core-normalizer/dist/index';
import { parseDocument } from '../../../core-parser/dist/index';
import { classifyFamily, runAdapters } from '../../../importer-adapters/dist/index';
import { FigureEditorError, OriginalSourceRef, Project } from '../../../ir-schema/dist/index';

export interface ReimportReport {
  artifactKind: ExportArtifact['kind'];
  project: Project;
  family: string;
  hintCount: number;
  warnings: string[];
}

export function reimportExportedArtifact(artifact: ExportArtifact, sourceHint?: Partial<OriginalSourceRef>): ReimportReport {
  try {
    const sourcePath = sourceHint?.path ?? `/virtual/reimport.${artifact.kind === 'html' ? 'html' : 'svg'}`;
    const source: OriginalSourceRef = {
      sourceId: sourceHint?.sourceId ?? 'reimport_source',
      kind: sourceHint?.kind ?? artifact.kind,
      path: sourcePath,
      sha256: sourceHint?.sha256 ?? 'reimport_generated',
      familyHint: sourceHint?.familyHint ?? 'unknown',
      importedAt: sourceHint?.importedAt ?? new Date().toISOString(),
    };

    const parseDocumentWithOptions = parseDocument as unknown as (
      input: { path: string; content: string },
      options?: { htmlMode?: 'strict_static' | 'limited' | 'snapshot' }
    ) => ReturnType<typeof parseDocument>;
    const parsed = parseDocumentWithOptions(
      { path: sourcePath, content: artifact.content },
      artifact.kind === 'html' ? { htmlMode: 'limited' } : undefined
    );
    const normalized = normalizeDocument(parsed);
    const family = classifyFamily(normalized);
    const hints = runAdapters(normalized, family);
    const project = assignCapabilities(liftToIR(normalized, hints, source).project).project;
    const parserMetadata = (parsed as typeof parsed & {
      parseMetadata?: { htmlMode: 'strict_static' | 'limited' | 'snapshot'; dynamicSignals: string[] };
    }).parseMetadata;
    const warnings = [
      ...artifact.warnings,
      ...(parserMetadata?.dynamicSignals.length
        ? [`reimport in ${parserMetadata.htmlMode} mode: ${parserMetadata.dynamicSignals.join(', ')}`]
        : []),
    ];
    return {
      artifactKind: artifact.kind,
      project,
      family,
      hintCount: hints.hints.length,
      warnings,
    };
  } catch (error) {
    throw new FigureEditorError('ERR_REIMPORT_FAILED', 'Failed to reimport exported artifact.', {
      cause: error instanceof Error ? error.message : String(error),
      artifactKind: artifact.kind,
    });
  }
}
