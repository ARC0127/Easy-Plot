"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneProject = cloneProject;
exports.getObject = getObject;
exports.getFigureBounds = getFigureBounds;
exports.getPanelBounds = getPanelBounds;
exports.pushConstraint = pushConstraint;
const index_1 = require("../../ir-schema/dist/index");
function cloneProject(project) {
    return structuredClone(project);
}
function getObject(project, objectId) {
    const obj = project.project.objects[objectId];
    if (!obj)
        throw new index_1.FigureEditorError('ERR_OBJECT_NOT_FOUND', `Object not found: ${objectId}`);
    return obj;
}
function getFigureBounds(project) {
    const vb = project.project.figure.viewBox;
    return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
}
function getPanelBounds(project, panelId) {
    const obj = getObject(project, panelId);
    if (obj.objectType !== 'panel') {
        throw new index_1.FigureEditorError('ERR_CAPABILITY_CONFLICT', `Target ${panelId} is not a panel.`);
    }
    return obj.bbox;
}
function pushConstraint(project, constraintType, subjectIds, targetId, params) {
    project.project.figure.constraints.push({
        id: `c_${project.project.figure.constraints.length + 1}`,
        constraintType: constraintType,
        subjectIds,
        targetId,
        params,
    });
}
