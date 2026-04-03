"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocument = parseDocument;
const index_1 = require("../../ir-schema/dist/index");
const parseSvg_1 = require("./svg/parseSvg");
const parseHtml_1 = require("./html/parseHtml");
function detectKindFromContent(content) {
    const trimmed = content.trim().toLowerCase();
    if (!trimmed)
        return null;
    if (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))
        return 'svg';
    if (trimmed.startsWith('<svg') || trimmed.includes('<svg'))
        return 'svg';
    if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || trimmed.includes('<body') || trimmed.includes('<div'))
        return 'html';
    return null;
}
function parseDocument(input, options = {}) {
    if (input.path.endsWith('.svg'))
        return (0, parseSvg_1.parseSvg)(input);
    if (input.path.endsWith('.html') || input.path.endsWith('.htm'))
        return (0, parseHtml_1.parseHtml)(input, options);
    const kind = detectKindFromContent(input.content);
    if (kind === 'svg')
        return (0, parseSvg_1.parseSvg)(input);
    if (kind === 'html')
        return (0, parseHtml_1.parseHtml)(input, options);
    throw new index_1.FigureEditorError('ERR_PARSE_FAILED', 'Unsupported file extension for parser.', { path: input.path });
}
