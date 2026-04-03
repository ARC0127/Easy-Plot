
import { AnyObject, ManualEditRecord } from '../../ir-schema/dist/index';

function nowIso(): string {
  return new Date().toISOString();
}

export function appendManualEdit(
  obj: AnyObject,
  kind: ManualEditRecord['kind'],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  reason: string,
): void {
  const record: ManualEditRecord = {
    editId: `me_${obj.id}_${obj.manualEdits.length + 1}`,
    kind,
    timestamp: nowIso(),
    before,
    after,
    reason,
  };
  obj.manualEdits.push(record);
}
