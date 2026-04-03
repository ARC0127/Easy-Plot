# 文档重建审计报告

- Status: audit
- Primary Source: rebuilt `docs/*`, frozen PDF sections 1-20, repository evidence
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. reconstruction_coverage_matrix

| PDF Section | 文档落点 |
| --- | --- |
| 1 | `docs/product/product-definition.md` |
| 2 | `docs/product/product-definition.md` |
| 3 | `docs/product/input-families-and-html-subset.md` |
| 4 | `docs/product/equivalence-and-stability-contracts.md` |
| 5 | `docs/architecture/system-architecture.md` |
| 6 | `docs/schema/figure-ir-overview.md`, `docs/schema/objects-and-capabilities.md`, `docs/schema/provenance-stability-history.md`, `docs/schema/constraints-and-invariants.md` |
| 7 | `docs/api/import-api.md` |
| 8 | `docs/api/editing-api.md` |
| 9 | `docs/architecture/desktop-and-runtime-boundaries.md` |
| 10 | `docs/api/export-roundtrip-api.md` |
| 11 | `docs/architecture/repo-and-module-design.md` |
| 12 | `docs/api/*`, `docs/schema/constraints-and-invariants.md`, `docs/api/typed-errors.md` |
| 13 | `docs/product/input-families-and-html-subset.md`, `docs/architecture/desktop-and-runtime-boundaries.md`, `docs/audit/performance-baseline.md`, `docs/audit/real-sample-stability.md` |
| 14 | `docs/acceptance/fixture-strategy.md`, `docs/acceptance/metrics-and-thresholds.md`, `docs/acceptance/acceptance-gate-and-audit-rules.md` |
| 15 | `docs/implementation/milestone-plan.md` |
| 16 | `docs/operations/release-process.md`, `docs/operations/release-notes.md`, `docs/operations/store-distribution.md`, `docs/implementation/import-capability-report.md`, `docs/operations/support-and-limitations.md`, `docs/audit/store-publish-ci.md` |
| 17 | `docs/implementation/gaps-and-backlog.md` |
| 18 | `docs/acceptance/acceptance-gate-and-audit-rules.md`, `docs/operations/release-process.md` |
| 19 | `docs/meta/source-of-truth.md`, `docs/index.md` |
| 20 | `docs/meta/change-policy.md` |

## 2. current_vs_target_gap_matrix

| 目标能力 | 当前状态 | gap |
| --- | --- | --- |
| 完整 docs 体系 | 完成 | 无 |
| 17 package 状态盘点 | 完成 | 无 |
| 桌面应用壳 | 完成 | 已实现 `DesktopAppShell` 生命周期、bridge 通道、四区 GUI 壳文档与 release bundle 产物链路 |
| 正式 tests 树 | 完成（基础） | 已建四层测试树并新增 release/performance/stability/distribution integration 用例 |
| family-wise acceptance | 完成 | 数据规模达标且 `overallPass=true` |
| EQ-L2 视觉稳定性 | 完成（smoke 样例） | roundtrip 视觉比较已达 pass（`normalizedPixelDiff=0`） |
| 正式发布资产（Sec 16） | 完成 | 已补齐 release notes / version manifest / versioned schema / Linux 安装包归档 / distribution manifests / credentialed publish CI 基线 |
| 性能证据（Sec 13.5） | 完成 | 已补齐可复现性能基线脚本与真实样例稳定性报告 |

## 3. verification_status_table

参见 `docs/audit/current-verification-report.md`，当前结论：

- smoke 链路可执行
- compile/build/test 链路可执行
- family-wise 正式验收已达成

## 4. open_risks_and_unknowns

- `dist` 跨包依赖耦合高，后续源码重构风险高。
- parser/normalizer 的 D3 深度合同已完成；扩展级语义（超出当前 D3 边界）在复杂输入族上仍有演进空间。
- 视觉等价当前已通过 smoke 与 real/weak_real 子集稳定性阈值；后续需持续扩展样本规模。
- desktop 已具备可验证 GUI 发布壳；后续重点转为可用性增强与外部凭据发布 CI 化。
- D8 真实性审计已通过（结构闭环 + 真实性比例阈值均达标）。
- Section 16 发布资产与 store 分发 staging 已闭环，后续重点为外部凭据发布流程。
- Section 13.5 已具备基线级 + 真实样例子集量化证据链，后续重点为更大真实样本规模扩展。
