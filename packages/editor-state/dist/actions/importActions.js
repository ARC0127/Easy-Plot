"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importIntoSession = importIntoSession;
const index_1 = require("../../../core-parser/dist/index");
const index_2 = require("../../../core-normalizer/dist/index");
const index_3 = require("../../../importer-adapters/dist/index");
const index_4 = require("../../../core-lifter/dist/index");
const index_5 = require("../../../core-capability/dist/index");
const projectStore_1 = require("../projectStore");
function applySnapshotReadOnly(project) {
    const next = structuredClone(project);
    const blocked = new Set([
        'drag',
        'resize',
        'delete',
        'text_edit',
        'style_edit',
        'group_only',
        'crop_only',
        'replace_image',
        'promote_semantic_role',
        'reparent',
    ]);
    for (const obj of Object.values(next.project.objects)) {
        obj.capabilities = obj.capabilities.filter((capability) => !blocked.has(capability));
    }
    if (!next.project.figure.metadata.tags.includes('session:snapshot_read_only')) {
        next.project.figure.metadata.tags.push('session:snapshot_read_only');
    }
    return next;
}
function annotateHtmlMode(project, htmlMode) {
    if (!htmlMode)
        return project;
    const next = structuredClone(project);
    next.project.figure.metadata.tags = next.project.figure.metadata.tags.filter((tag) => !tag.startsWith('html_mode:'));
    next.project.figure.metadata.tags.push(`html_mode:${htmlMode}`);
    if (htmlMode !== 'snapshot') {
        next.project.figure.metadata.tags = next.project.figure.metadata.tags.filter((tag) => tag !== 'session:snapshot_read_only');
    }
    return next;
}
function importIntoSession(file, source, options = {}) {
    const htmlLike = file.path.endsWith('.html') || file.path.endsWith('.htm');
    const parseDocumentWithOptions = index_1.parseDocument;
    const requestedHtmlMode = htmlLike ? options.htmlMode ?? 'limited' : undefined;
    const parsed = parseDocumentWithOptions(file, requestedHtmlMode ? { htmlMode: requestedHtmlMode } : undefined);
    const normalized = (0, index_2.normalizeDocument)(parsed);
    const family = (0, index_3.classifyFamily)(normalized);
    const hints = (0, index_3.runAdapters)(normalized, family);
    const lifted = (0, index_4.liftToIR)(normalized, hints, source);
    const cap = (0, index_5.assignCapabilities)(lifted.project);
    const parserMetadata = parsed.parseMetadata;
    const effectiveHtmlMode = parserMetadata?.htmlMode ?? requestedHtmlMode;
    const snapshotApplied = effectiveHtmlMode === 'snapshot';
    const projectWithPolicy = snapshotApplied ? applySnapshotReadOnly(cap.project) : cap.project;
    const project = annotateHtmlMode(projectWithPolicy, effectiveHtmlMode);
    const session = (0, projectStore_1.createEditorSession)(project, {
        htmlMode: effectiveHtmlMode ?? null,
        policyMode: snapshotApplied ? 'snapshot_read_only' : 'default',
        reason: snapshotApplied ? 'html_snapshot_mode' : null,
    });
    const dynamicSignals = parserMetadata?.dynamicSignals ?? [];
    const parserWarnings = dynamicSignals.length === 0
        ? effectiveHtmlMode === 'snapshot'
            ? ['HTML imported in snapshot mode: session is read-only and editable capabilities are stripped by policy.']
            : []
        : [`HTML imported in ${parserMetadata?.htmlMode ?? 'limited'} mode due to dynamic signals: ${dynamicSignals.join(', ')}`];
    if (effectiveHtmlMode === 'snapshot' && dynamicSignals.length > 0) {
        parserWarnings.push('Snapshot mode applied: dynamic HTML is preserved as read-only representation.');
    }
    return { ...session, warnings: [...session.warnings, ...cap.warnings, ...parserWarnings] };
}
