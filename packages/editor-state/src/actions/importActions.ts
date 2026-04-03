
import { OriginalSourceRef, Project } from '../../../ir-schema/dist/index';
import { parseDocument } from '../../../core-parser/dist/index';
import { normalizeDocument } from '../../../core-normalizer/dist/index';
import { classifyFamily, runAdapters } from '../../../importer-adapters/dist/index';
import { liftToIR } from '../../../core-lifter/dist/index';
import { assignCapabilities } from '../../../core-capability/dist/index';
import { createEditorSession } from '../projectStore';
import { EditorSessionState } from '../types';

export interface ImportFileRef {
  path: string;
  content: string;
}

export interface ImportIntoSessionOptions {
  htmlMode?: 'strict_static' | 'limited' | 'snapshot';
}

function applySnapshotReadOnly(project: Project): Project {
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

function annotateHtmlMode(project: Project, htmlMode: 'strict_static' | 'limited' | 'snapshot' | undefined): Project {
  if (!htmlMode) return project;
  const next = structuredClone(project);
  next.project.figure.metadata.tags = next.project.figure.metadata.tags.filter(
    (tag) => !tag.startsWith('html_mode:')
  );
  next.project.figure.metadata.tags.push(`html_mode:${htmlMode}`);
  if (htmlMode !== 'snapshot') {
    next.project.figure.metadata.tags = next.project.figure.metadata.tags.filter(
      (tag) => tag !== 'session:snapshot_read_only'
    );
  }
  return next;
}

export function importIntoSession(
  file: ImportFileRef,
  source: OriginalSourceRef,
  options: ImportIntoSessionOptions = {}
): EditorSessionState {
  const htmlLike = file.path.endsWith('.html') || file.path.endsWith('.htm');
  const parseDocumentWithOptions = parseDocument as unknown as (
    input: ImportFileRef,
    options?: { htmlMode?: 'strict_static' | 'limited' | 'snapshot' }
  ) => ReturnType<typeof parseDocument>;
  const requestedHtmlMode = htmlLike ? options.htmlMode ?? 'limited' : undefined;
  const parsed = parseDocumentWithOptions(file, requestedHtmlMode ? { htmlMode: requestedHtmlMode } : undefined);
  const normalized = normalizeDocument(parsed);
  const family = classifyFamily(normalized);
  const hints = runAdapters(normalized, family);
  const lifted = liftToIR(normalized, hints, source);
  const cap = assignCapabilities(lifted.project);
  const parserMetadata = (parsed as typeof parsed & {
    parseMetadata?: {
      htmlMode: 'strict_static' | 'limited' | 'snapshot';
      dynamicSignals: string[];
    };
  }).parseMetadata;
  const effectiveHtmlMode = parserMetadata?.htmlMode ?? requestedHtmlMode;
  const snapshotApplied = effectiveHtmlMode === 'snapshot';
  const projectWithPolicy = snapshotApplied ? applySnapshotReadOnly(cap.project) : cap.project;
  const project = annotateHtmlMode(projectWithPolicy, effectiveHtmlMode);
  const session = createEditorSession(project, {
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
