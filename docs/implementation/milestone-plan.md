# 阶段里程碑（A-F）

- Status: implemented
- Primary Source: requested execution plan, frozen spec section 15
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + smoke rerun

## Phase A 文档地基

- 交付：`docs/index` + `docs/meta/*`
- 退出条件：文档分层、真源优先级、元数据规则固定。

## Phase B 规范重建

- 交付：`docs/product/*` + `docs/architecture/*` + `docs/schema/*` + `docs/api/*` + `docs/acceptance/*`
- 退出条件：冻结规范章节 1-14 具备可追溯落点。

## Phase C 实现映射

- 交付：`docs/implementation/current-state-matrix.md` + `capability-coverage-matrix.md`
- 退出条件：17 packages、scripts、fixtures 均纳入状态盘点。

## Phase D gap 转 backlog

- 交付：`docs/implementation/gaps-and-backlog.md`
- 退出条件：按 import/editor/export/acceptance/desktop/tests 六线分解执行项。

## Phase E 运维文档

- 交付：`docs/operations/*`
- 退出条件：协作、ADR、发布、支持边界文档可用。

## Phase F 审计封口

- 交付：`docs/audit/evidence-ledger.md` + `current-verification-report.md` + `document-reconstruction-audit.md`
- 退出条件：重建覆盖矩阵、gap 矩阵、验证状态表、风险清单齐备。
