"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProject = validateProject;
exports.getProjectJsonSchema = getProjectJsonSchema;
const project_schema_json_1 = __importDefault(require("../json-schema/project.schema.json"));
const invariantValidator_1 = require("./invariantValidator");
/**
 * MVP draft note:
 * - Structural JSON-schema validation is intentionally not implemented with Ajv here,
 *   because this draft avoids adding runtime dependencies before the repository baseline is stable.
 * - This function guarantees schema availability + invariant validation.
 * - Full JSON-schema runtime validation can be plugged in later without changing the call signature.
 */
function validateProject(project) {
    const base = (0, invariantValidator_1.validateInvariants)(project);
    return {
        ...base,
        schemaVersion: project.schemaVersion,
        schemaLoaded: true,
    };
}
function getProjectJsonSchema() {
    return project_schema_json_1.default;
}
