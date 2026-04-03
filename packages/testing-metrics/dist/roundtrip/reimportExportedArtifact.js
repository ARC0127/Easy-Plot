"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reimportExportedArtifact = reimportExportedArtifact;
const index_1 = require("../../../core-capability/dist/index");
const index_2 = require("../../../core-lifter/dist/index");
const index_3 = require("../../../core-normalizer/dist/index");
const index_4 = require("../../../core-parser/dist/index");
const index_5 = require("../../../importer-adapters/dist/index");
const index_6 = require("../../../ir-schema/dist/index");
function reimportExportedArtifact(artifact, sourceHint) {
    try {
        const sourcePath = sourceHint?.path ?? `/virtual/reimport.${artifact.kind === 'html' ? 'html' : 'svg'}`;
        const source = {
            sourceId: sourceHint?.sourceId ?? 'reimport_source',
            kind: sourceHint?.kind ?? artifact.kind,
            path: sourcePath,
            sha256: sourceHint?.sha256 ?? 'reimport_generated',
            familyHint: sourceHint?.familyHint ?? 'unknown',
            importedAt: sourceHint?.importedAt ?? new Date().toISOString(),
        };
        const parseDocumentWithOptions = index_4.parseDocument;
        const parsed = parseDocumentWithOptions({ path: sourcePath, content: artifact.content }, artifact.kind === 'html' ? { htmlMode: 'limited' } : undefined);
        const normalized = (0, index_3.normalizeDocument)(parsed);
        const family = (0, index_5.classifyFamily)(normalized);
        const hints = (0, index_5.runAdapters)(normalized, family);
        const project = (0, index_1.assignCapabilities)((0, index_2.liftToIR)(normalized, hints, source).project).project;
        const parserMetadata = parsed.parseMetadata;
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
    }
    catch (error) {
        throw new index_6.FigureEditorError('ERR_REIMPORT_FAILED', 'Failed to reimport exported artifact.', {
            cause: error instanceof Error ? error.message : String(error),
            artifactKind: artifact.kind,
        });
    }
}
