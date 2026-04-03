"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liftToIR = liftToIR;
const buildProject_1 = require("./buildProject");
function liftToIR(normalized, hints, source) {
    return (0, buildProject_1.buildProject)(normalized, hints, source);
}
