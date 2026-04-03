# Global Gate 与审计口径

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 14.6, 18), `packages/testing-metrics/src/acceptance/*`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + smoke rerun

## 1. Global Gate（冻结）

MVP 全局通过条件：

- `matplotlib` family-pass
- `llm_svg` family-pass
- `static_html_inline_svg` family-pass
- 其余 family 中至少 2 个 family-pass
- `degraded_svg` 即使未 full-pass，也必须满足 honest labeling 指标

## 2. 审计口径

- smoke 通过只表示“管线可执行”，不是“阈值通过”。
- 正式通过结论必须基于 fixture + ground truth + M1-M7 全量计算。
- 所有“不支持/弱支持”能力必须在用户面明确标注，禁止伪装。

## 3. 当前状态结论

- `computeAcceptanceMetrics/familyPass/globalPass` 已有函数入口。
- 已有完整 family-wise 报告资产：`docs/audit/family_acceptance_report.json`。
- 当前报告结论：`overallPass=true`，已达到 global gate。
- D8 真实性审计为并行约束，不由 M1-M7 gate 直接覆盖；当前 `docs/audit/fixture_authenticity_report.json` 为 `status=pass`。
