# 文档变更策略

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 20)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 变更原则

- 不删除已冻结核心合同，只允许追加修订并记录差异。
- 所有扩展项必须包含：合同变更、schema/API 变更、验收阈值变更。
- 无重验证据不得声明“需求已升级通过”。

## 2. 文档版本规则

- 每次文档更新必须同步更新 `Last Verified`。
- 影响范围较大时，新增 `Change Note` 小节说明“改了什么、为什么改、证据在哪里”。
- `audit` 文档必须保留历史结果，不覆盖原始记录。

## 3. 代码与文档联动规则

- 若代码能力发生变化，必须同步更新：
- `docs/implementation/current-state-matrix.md`
- `docs/implementation/capability-coverage-matrix.md`
- `docs/audit/current-verification-report.md`
- 对合同有影响时，同时更新 `docs/schema/*` 与 `docs/api/*`。
- 每轮“整理/补齐”后必须执行 proof 验证闭环，并更新：
- `docs/audit/proof-verification-loop.md`
- `artifacts/proof_casebook.md`
- `artifacts/evidence_ledger.csv`

## 4. 例外处理

- 若发现规范与真实输入分布冲突，记录到 `negative result` 风险项，先标注 `gap`，再提交修订提案。
