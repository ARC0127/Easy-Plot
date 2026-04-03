"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInvariants = validateInvariants;
const capabilityValidator_1 = require("./capabilityValidator");
function validateInvariants(project) {
    const issues = [];
    const objects = Object.values(project.project.objects);
    const snapshotReadOnly = project.project.figure.metadata.tags.includes('session:snapshot_read_only');
    if (project.project.sourceMode === 'imported' && project.project.originalSources.length === 0) {
        issues.push({
            code: 'INV_IMPORTED_PROJECT_MISSING_SOURCE_ARCHIVE',
            level: 'error',
            message: 'Imported project must archive originalSources.',
        });
    }
    for (const obj of objects) {
        if (!obj.id) {
            issues.push({ code: 'INV_MISSING_ID', level: 'error', message: 'Object id is missing.' });
        }
        if (project.project.sourceMode === 'imported' && !obj.provenance.originSourceId) {
            issues.push({
                code: 'INV_IMPORTED_OBJECT_MISSING_PROVENANCE',
                level: 'error',
                objectId: obj.id,
                message: 'Imported object must have provenance.originSourceId.',
            });
        }
        if (obj.objectType === 'text_node') {
            const textKind = obj.textKind;
            const hasTextEdit = obj.capabilities.includes('text_edit');
            if (textKind === 'raw_text' && !hasTextEdit && !snapshotReadOnly) {
                issues.push({
                    code: 'INV_RAW_TEXT_MISSING_TEXT_EDIT',
                    level: 'error',
                    objectId: obj.id,
                    message: 'raw_text must have text_edit capability.',
                });
            }
            if ((textKind === 'path_text_proxy' || textKind === 'raster_text_proxy') && hasTextEdit) {
                issues.push({
                    code: 'INV_PROXY_TEXT_ILLEGAL_TEXT_EDIT',
                    level: 'error',
                    objectId: obj.id,
                    message: 'Proxy text must not expose text_edit capability.',
                });
            }
        }
        if (obj.objectType === 'legend' || obj.objectType === 'figure_title' || obj.objectType === 'panel_label') {
            const anchoredObj = obj;
            if (anchoredObj.anchor === undefined || anchoredObj.offset === undefined) {
                issues.push({
                    code: 'INV_ANCHORED_OBJECT_MISSING_ANCHOR_OR_OFFSET',
                    level: 'error',
                    objectId: anchoredObj.id,
                    message: 'Legend/title/label must define anchor and offset.',
                });
            }
        }
        if (obj.stability.reimportExpectation === 'atomic' && obj.capabilities.includes('text_edit')) {
            issues.push({
                code: 'INV_ATOMIC_OBJECT_ILLEGAL_TEXT_EDIT',
                level: 'error',
                objectId: obj.id,
                message: 'Atomic reimportExpectation object cannot expose text_edit.',
            });
        }
    }
    for (const issue of (0, capabilityValidator_1.validateCapabilityConflicts)(project)) {
        issues.push({ ...issue, level: 'error' });
    }
    return {
        ok: issues.every(issue => issue.level !== 'error'),
        issues,
    };
}
