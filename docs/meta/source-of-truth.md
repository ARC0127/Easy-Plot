# Source of Truth 规则

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 0, 5, 19, 20), repository evidence
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 真源优先级

1. 冻结需求文件 `Figure Editor Complete Requirements Spec V1.pdf`
2. 仓库源码与脚本（`packages/*`, `scripts/*`, `fixtures/*`）
3. 历史审计文档（例如 `docs/audit/coding_engine_review.md`）

## 2. 冲突处理

- 若实现与 PDF 冲突：文档必须标记为 `gap`，不得把实现覆盖规范。
- 若历史审计与当前重验冲突：以当前重验证据为准，历史结果保留为历史记录。
- 若同层文档冲突：以 `Last Verified` 更近且证据更完整者为准。

## 3. 文档陈述规则

- 只允许三种陈述：
- `目标合同`: 来自冻结规范，使用 `normative`。
- `当前实现`: 来自代码和可运行脚本，使用 `implemented`。
- `差异与计划`: 来自目标与实现差异，使用 `gap`。

## 4. 禁止项

- 禁止将 smoke PASS 写成 family-wise acceptance PASS。
- 禁止将 placeholder/stub 写成“生产级已完成”。
- 禁止在没有证据的情况下声称 compile/build/e2e 全通过。

## 5. 本轮执行框架

本轮文档重建执行时采用 `zyr-coding-engine` / `S430 DEBUG_VIBE_CORE` 的证据优先约束：

- 先证据后结论
- 区分历史结果与当前重验结果
- 闭环命令与回归记录必须进入 `docs/audit/*`
