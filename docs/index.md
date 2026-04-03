# Figure Editor 文档总入口

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 0-20), repository `packages/*`, `scripts/*`, `fixtures/*`
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. 文档目标

本套文档用于把冻结需求与当前草稿实现统一到一个可执行、可审计、可交接的工程文档体系。  
文档只做事实重建，不伪造“已实现”。

## 2. 事实分层

- `normative`: 冻结需求规范（PDF）定义的目标合同。
- `implemented`: 当前仓库已存在代码和脚本可证明的能力。
- `gap`: 目标合同与当前实现之间的明确缺口与执行项。
- `audit`: 验证证据、运行结果、审计矩阵与风险记录。

## 3. 阅读顺序

1. `docs/meta/source-of-truth.md`
2. `docs/product/product-definition.md`
3. `docs/architecture/system-architecture.md`
4. `docs/schema/figure-ir-overview.md`
5. `docs/api/import-api.md`
6. `docs/acceptance/metrics-and-thresholds.md`
7. `docs/implementation/current-state-matrix.md`
8. `docs/implementation/gaps-and-backlog.md`
9. `docs/audit/current-verification-report.md`
10. `docs/audit/proof-verification-loop.md`
11. `docs/audit/family-acceptance-summary.md`
12. `docs/audit/fixture-authenticity-audit.md`
13. `docs/audit/performance-baseline.md`
14. `docs/audit/real-sample-stability.md`
15. `docs/audit/store-publish-ci.md`

## 4. 目录索引

- `docs/meta/`: 文档规则、术语、变更机制、真源优先级。
- `docs/product/`: 产品定义、输入族、HTML 子集、等价与稳定合同。
- `docs/architecture/`: 三层真源架构、数据流、模块边界、桌面端边界。
- `docs/schema/`: Figure IR 顶层结构、对象、能力、约束与 invariants。
- `docs/api/`: Import/Project/Editing/Export/Verification API 与 typed errors。
- `docs/acceptance/`: fixture 规范、指标定义、阈值与 global gate。
- `docs/implementation/`: 当前实现状态矩阵、能力覆盖、gap/backlog、里程碑。
- `docs/implementation/import-capability-report.md`: import 能力分级与 HTML mode 合同。
- `docs/operations/`: 研发协作、ADR、发布、支持与限制说明。
- `docs/operations/release-notes.md`: 发布说明与版本摘要。
- `docs/operations/store-distribution.md`: 分渠道分发自动化（dry-run）与 upload queue 说明。
- `docs/operations/desktop-pilot-quickstart.md`: desktop pilot 快速入口。
- `docs/operations/desktop-shell-quickstart.md`: desktop GUI shell 快速入口。
- `docs/audit/`: 证据台账、当前验证报告、proof 验证循环台账、family 验收摘要、fixture 真实性审计、性能基线报告、重建审计报告。
- `docs/audit/store-publish-ci.md`: store 凭据发布 CI readiness 报告。

## 5. 冻结规范章节映射

- Sections 1-5 -> `docs/product/*`, `docs/architecture/system-architecture.md`
- Section 6 -> `docs/schema/*`
- Sections 7-10 -> `docs/api/*`, `docs/implementation/capability-coverage-matrix.md`
- Section 11 -> `docs/architecture/repo-and-module-design.md`
- Section 12 -> `docs/api/*`, `docs/schema/constraints-and-invariants.md`
- Sections 13-14 -> `docs/acceptance/*`
- Sections 15-18 -> `docs/implementation/*`, `docs/operations/*`
- Sections 19-20 -> `docs/meta/change-policy.md`, `docs/audit/document-reconstruction-audit.md`
