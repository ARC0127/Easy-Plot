"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSvg = parseSvg;
const xmlLike_1 = require("../xmlLike");
function parseSvg(input) {
    return (0, xmlLike_1.parseXmlLike)(input.content, 'svg');
}
