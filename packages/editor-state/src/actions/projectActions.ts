import { readFileSync, writeFileSync } from 'fs';
import { FigureEditorError, OriginalSourceRef, Project, validateProject } from '../../../ir-schema/dist/index';

export interface FigureInit {
  projectId?: string;
  figureId?: string;
  width?: number;
  height?: number;
  background?: string;
  title?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyProject(init: FigureInit = {}): Project {
  const width = init.width ?? 800;
  const height = init.height ?? 600;
  const ts = nowIso();
  return {
    schemaVersion: '1.0.0-mvp',
    project: {
      projectId: init.projectId ?? 'proj_empty',
      createdAt: ts,
      updatedAt: ts,
      sourceMode: 'native',
      originalSources: [],
      figure: {
        figureId: init.figureId ?? 'fig_empty',
        width,
        height,
        viewBox: [0, 0, width, height],
        background: init.background ?? '#ffffff',
        panels: [],
        legends: [],
        floatingObjects: [],
        renderTreeRootId: 'obj_root',
        constraints: [],
        metadata: {
          title: init.title ?? '',
          description: '',
          tags: [],
        },
      },
      importRecords: [],
      history: { undoStack: [], redoStack: [], operationLog: [] },
      exportPolicy: {
        defaultExportKind: 'svg',
        svg: { preferTextNode: true, flattenFragileObjects: false, embedImages: true },
        html: { mode: 'inline_svg_preferred', inlineStyles: true, externalCSS: false },
      },
      objects: {},
    },
  };
}

export function archiveOriginalSource(project: Project, source: OriginalSourceRef): Project {
  const next = structuredClone(project);
  const existing = next.project.originalSources.findIndex((item) => item.sourceId === source.sourceId);
  if (existing >= 0) {
    next.project.originalSources[existing] = source;
  } else {
    next.project.originalSources.push(source);
  }
  if (next.project.sourceMode === 'native') {
    next.project.sourceMode = 'imported';
  }
  next.project.updatedAt = nowIso();
  return next;
}

export function validateProjectState(project: Project): ReturnType<typeof validateProject> {
  return validateProject(project);
}

export function saveProject(project: Project, path: string): void {
  const report = validateProject(project);
  if (!report.ok) {
    throw new FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Project is invalid and cannot be saved.', {
      path,
      issues: report.issues,
    });
  }
  writeFileSync(path, JSON.stringify(project, null, 2), 'utf8');
}

export function loadProject(path: string): Project {
  let project: Project;
  try {
    const raw = readFileSync(path, 'utf8');
    project = JSON.parse(raw) as Project;
  } catch (error) {
    throw new FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Failed to read project file.', {
      path,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const report = validateProject(project);
  if (!report.ok) {
    throw new FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Loaded project failed validation.', {
      path,
      issues: report.issues,
    });
  }
  return project;
}
