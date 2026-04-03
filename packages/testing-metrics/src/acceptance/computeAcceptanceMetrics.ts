
import { AcceptanceSummary } from '../reports/types';

export interface AcceptanceReportInput {
  metrics: Record<string, number>;
  thresholds: Record<string, number>;
}

export function computeAcceptanceMetrics(family: string, reports: AcceptanceReportInput[]): AcceptanceSummary {
  const aggregate: Record<string, number[]> = {};
  for (const report of reports) {
    for (const [k, v] of Object.entries(report.metrics)) {
      aggregate[k] ??= [];
      aggregate[k].push(v);
    }
  }
  const metrics: Record<string, number> = {};
  for (const [k, values] of Object.entries(aggregate)) {
    metrics[k] = values.reduce((a, b) => a + b, 0) / values.length;
  }
  const thresholds = reports[0]?.thresholds ?? {};
  const failingMetrics = Object.entries(thresholds)
    .filter(([k, threshold]) => (metrics[k] ?? 0) < threshold)
    .map(([k]) => k);
  return { family, metrics, pass: failingMetrics.length === 0, failingMetrics };
}
