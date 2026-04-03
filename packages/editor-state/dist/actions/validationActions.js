"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCurrentProject = validateCurrentProject;
const index_1 = require("../../../ir-schema/dist/index");
function validateCurrentProject(state) {
    const schema = (0, index_1.validateProject)(state.project);
    const invariants = (0, index_1.validateInvariants)(state.project);
    const capabilities = (0, index_1.validateCapabilityConflicts)(state.project);
    return {
        schema,
        invariants,
        capabilities,
        ok: schema.ok && invariants.ok && capabilities.length === 0,
    };
}
