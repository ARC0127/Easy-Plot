"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyProject = createEmptyProject;
exports.archiveOriginalSource = archiveOriginalSource;
exports.validateProjectState = validateProjectState;
exports.saveProject = saveProject;
exports.loadProject = loadProject;
const fs_1 = require("fs");
const index_1 = require("../../../ir-schema/dist/index");
function nowIso() {
    return new Date().toISOString();
}
function createEmptyProject(init = {}) {
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
function archiveOriginalSource(project, source) {
    const next = structuredClone(project);
    const existing = next.project.originalSources.findIndex((item) => item.sourceId === source.sourceId);
    if (existing >= 0) {
        next.project.originalSources[existing] = source;
    }
    else {
        next.project.originalSources.push(source);
    }
    if (next.project.sourceMode === 'native') {
        next.project.sourceMode = 'imported';
    }
    next.project.updatedAt = nowIso();
    return next;
}
function validateProjectState(project) {
    return (0, index_1.validateProject)(project);
}
function saveProject(project, path) {
    const report = (0, index_1.validateProject)(project);
    if (!report.ok) {
        throw new index_1.FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Project is invalid and cannot be saved.', {
            path,
            issues: report.issues,
        });
    }
    (0, fs_1.writeFileSync)(path, JSON.stringify(project, null, 2), 'utf8');
}
function loadProject(path) {
    let project;
    try {
        const raw = (0, fs_1.readFileSync)(path, 'utf8');
        project = JSON.parse(raw);
    }
    catch (error) {
        throw new index_1.FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Failed to read project file.', {
            path,
            cause: error instanceof Error ? error.message : String(error),
        });
    }
    const report = (0, index_1.validateProject)(project);
    if (!report.ok) {
        throw new index_1.FigureEditorError('ERR_SCHEMA_VALIDATION_FAILED', 'Loaded project failed validation.', {
            path,
            issues: report.issues,
        });
    }
    return project;
}
