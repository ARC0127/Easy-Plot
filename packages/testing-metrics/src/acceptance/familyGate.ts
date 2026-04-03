
import { AcceptanceSummary } from '../reports/types';

export function familyPass(summary: AcceptanceSummary): boolean {
  return summary.pass;
}
