# Fixture 策略与 Ground Truth

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 14.1, 14.2), `fixtures/*`, `packages/testing-fixtures/*`, `scripts/fixture_authenticity_audit.cjs`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + acceptance rerun + smoke rerun

## 1. 规范目标样本规模

- `matplotlib`: >= 10
- `chart_family`: >= 8
- `illustration_like`: >= 8
- `llm_svg`: >= 10
- `static_html_inline_svg`: >= 8
- `degraded_svg`: >= 8

## 2. 当前仓库状态

- fixture 基线文件：
- `fixtures/fixture_family_matrix.csv`
- `fixtures/fixture_provenance_matrix.csv`
- `fixtures/ground_truth_schema.json`
- `fixtures/acceptance_thresholds.md`
- `packages/testing-fixtures/data/*` 已扩容到规范最小规模：
- `matplotlib=10`
- `chart_family=8`
- `illustration_like=8`
- `llm_svg=10`
- `static_html_inline_svg=8`
- `degraded_svg=8`
- root `fixtures/<family>/*` 已生成对应 ground truth JSON 文件，并补齐 `fixtureId/family/provenanceRef`。

## 3. Ground truth 最小标注项

- `fixtureId`
- `family`
- `provenanceRef`
- ground truth `panels`
- legend 是否存在
- editable raw texts
- atomic raster blocks
- 是否允许 panel delete / legend drag / text edit

## 4. 当前状态

- family-wise 报告已通过 global gate（`overallPass=true`）。
- `smoke:fixture-authenticity` 当前结论：`structuralPass=true`、`authenticityPass=true`、`status=pass`。
- D8 已完成：`nonSyntheticRatio=0.36538461538461536`，高于目标阈值 `0.35`。
