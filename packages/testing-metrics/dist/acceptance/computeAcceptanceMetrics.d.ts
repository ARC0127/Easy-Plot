import { AcceptanceSummary } from '../reports/types';
export interface AcceptanceReportInput {
    metrics: Record<string, number>;
    thresholds: Record<string, number>;
}
export declare function computeAcceptanceMetrics(family: string, reports: AcceptanceReportInput[]): AcceptanceSummary;
//# sourceMappingURL=computeAcceptanceMetrics.d.ts.map