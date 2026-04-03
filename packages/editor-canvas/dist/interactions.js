"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dragObject = dragObject;
exports.resizeObject = resizeObject;
exports.editTextObject = editTextObject;
const index_1 = require("../../core-history/dist/index");
function dragObject(project, objectId, dx, dy) {
    return (0, index_1.applyOperation)(project, { type: 'MOVE_OBJECT', payload: { objectId, delta: { x: dx, y: dy } } });
}
function resizeObject(project, objectId, bbox) {
    return (0, index_1.applyOperation)(project, { type: 'RESIZE_OBJECT', payload: { objectId, bbox } });
}
function editTextObject(project, objectId, content) {
    return (0, index_1.applyOperation)(project, { type: 'EDIT_TEXT_CONTENT', payload: { objectId, content } });
}
