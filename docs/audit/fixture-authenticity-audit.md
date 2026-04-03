# Fixture 真实性审计报告

- Status: audit
- Primary Source: `fixtures/fixture_family_matrix.csv`, `fixtures/fixture_provenance_matrix.csv`, `fixtures/*/*.ground_truth.json`, `packages/testing-fixtures/data/*`, `scripts/fixture_authenticity_audit.cjs`
- Last Verified: 2026-04-02
- Verification Mode: smoke rerun + integration rerun

## 1. 审计目标

- 验证 fixture 与 ground truth 的结构一致性是否闭环。
- 验证 provenance 台账是否覆盖全部 fixture。
- 输出真实性指标并对 D8 做 honest labeling。

## 2. 当前审计结论

- `structuralPass=true`：52/52 fixture 在 matrix、provenance、ground truth、package data 之间可对齐。
- `authenticityPass=true`：`nonSyntheticRatio=0.36538461538461536`，达到目标阈值 `0.35`。
- `overallPass=true`，状态为 `pass`。

## 3. 证据产物

- 自动审计命令：`npm run smoke:fixture-authenticity`
- 审计 JSON：`docs/audit/fixture_authenticity_report.json`

## 4. D8 下一步

- 维持 `nonSyntheticRatio >= 0.35` 的真实性配比，不允许回退为全 synthetic。
- 新增 fixture 时同步维护 provenance 与许可信息，并保持 `structuralPass=true`。
- 将真实性审计持续纳入 `smoke:all` 与 integration 回归。
