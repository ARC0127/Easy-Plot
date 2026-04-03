"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEditorSession = createEditorSession;
exports.setProject = setProject;
function deriveHtmlMode(project) {
    const tags = project.project.figure.metadata.tags;
    const modeTag = tags.find((tag) => tag.startsWith('html_mode:'));
    if (!modeTag)
        return null;
    const mode = modeTag.slice('html_mode:'.length);
    return mode === 'strict_static' || mode === 'limited' || mode === 'snapshot' ? mode : null;
}
function derivePolicyMode(project) {
    return project.project.figure.metadata.tags.includes('session:snapshot_read_only') ? 'snapshot_read_only' : 'default';
}
function createEditorSession(project, options = {}) {
    const policyMode = options.policyMode ?? derivePolicyMode(project);
    const htmlMode = options.htmlMode ?? deriveHtmlMode(project);
    return {
        project,
        policy: {
            sessionMode: policyMode,
            htmlMode,
            readOnly: policyMode === 'snapshot_read_only',
            reason: policyMode === 'snapshot_read_only' ? options.reason ?? 'snapshot_policy' : null,
        },
        selection: { selectedIds: [], hoveredId: null },
        interaction: { mode: 'idle', activeObjectId: null },
        warnings: [],
    };
}
function setProject(state, project) {
    return { ...state, project };
}
