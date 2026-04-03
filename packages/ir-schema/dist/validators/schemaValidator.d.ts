import type { Project } from '../project';
import { type ValidationReport } from './invariantValidator';
export interface SchemaValidationReport extends ValidationReport {
    schemaVersion: string;
    schemaLoaded: boolean;
}
/**
 * MVP draft note:
 * - Structural JSON-schema validation is intentionally not implemented with Ajv here,
 *   because this draft avoids adding runtime dependencies before the repository baseline is stable.
 * - This function guarantees schema availability + invariant validation.
 * - Full JSON-schema runtime validation can be plugged in later without changing the call signature.
 */
export declare function validateProject(project: Project): SchemaValidationReport;
export declare function getProjectJsonSchema(): Record<string, unknown>;
//# sourceMappingURL=schemaValidator.d.ts.map