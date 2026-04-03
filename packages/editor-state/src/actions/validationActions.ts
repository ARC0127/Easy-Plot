
import { validateCapabilityConflicts, validateInvariants, validateProject } from '../../../ir-schema/dist/index';
import { EditorSessionState } from '../types';

export interface CombinedValidationReport {
  schema: ReturnType<typeof validateProject>;
  invariants: ReturnType<typeof validateInvariants>;
  capabilities: ReturnType<typeof validateCapabilityConflicts>;
  ok: boolean;
}

export function validateCurrentProject(state: EditorSessionState): CombinedValidationReport {
  const schema = validateProject(state.project);
  const invariants = validateInvariants(state.project);
  const capabilities = validateCapabilityConflicts(state.project);
  return {
    schema,
    invariants,
    capabilities,
    ok: schema.ok && invariants.ok && capabilities.length === 0,
  };
}
