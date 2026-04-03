# 等价性与稳定性合同

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 4)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. Import Equivalence Contract

- EQ-L0: project-level semantic equivalence（native project reopen 语义保持）。
- EQ-L1: structural equivalence（高层对象层级不应非预期塌缩）。
- EQ-L2: visual equivalence（固定渲染环境视觉差异低于阈值）。
- EQ-L3: interaction equivalence（高频交互能力在导出/重开/重导入后不系统性退化）。

## 2. 第一代 imported workflow 最低成功标准

- 必须同时满足 `EQ-L2 pass` 与 `EQ-L3 pass`。

## 3. Edit-Stability Contract

- S1 `No-op round-trip`: 不编辑直接导出仍满足视觉阈值。
- S2 `Single-edit`: 一次核心编辑后保存/重开/再保存不出现显著漂移。
- S3 `Re-import interaction`: 重导入后高频交互能力不系统性丢失。

## 4. 当前草稿实现口径（implemented reference）

- 视觉等价函数入口：`packages/testing-metrics/src/visual/computeVisualEquivalence.ts`
- 交互保留函数入口：`packages/testing-metrics/src/interaction/retention.ts`
- 当前状态：具备指标计算入口，但尚不构成正式 family-wise acceptance 结论。
