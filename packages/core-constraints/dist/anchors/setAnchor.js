"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAnchor = setAnchor;
const index_1 = require("../../../ir-schema/dist/index");
const helpers_1 = require("../helpers");
function setAnchor(project, objectId, anchor, offset) {
    const next = (0, helpers_1.cloneProject)(project);
    const obj = (0, helpers_1.getObject)(next, objectId);
    if (!('anchor' in obj) || !('offset' in obj)) {
        throw new index_1.FigureEditorError('ERR_CAPABILITY_CONFLICT', `Object ${objectId} does not expose anchor/offset.`);
    }
    obj.anchor = {
        kind: anchor.kind,
        value: anchor.value,
        targetPanelId: anchor.targetPanelId ?? null,
    };
    obj.offset = offset;
    const type = anchor.kind === 'panel_anchor' ? 'anchor_to_panel' : 'anchor_to_figure';
    (0, helpers_1.pushConstraint)(next, type, [objectId], anchor.targetPanelId ?? null, { anchor, offset });
    return { project: next, appliedConstraint: next.project.figure.constraints[next.project.figure.constraints.length - 1] };
}
