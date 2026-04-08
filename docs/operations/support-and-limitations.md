# 支持范围与已知限制

- Status: implemented
- Primary Source: frozen spec sections 1.5, 3.3, 13, 16, repository implementation evidence, `scripts/real_sample_stability_report.cjs`, `scripts/build_store_distribution.cjs`, `scripts/publish_store_distribution.cjs`
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. 当前可支持（草稿级）

- 基础导入链路：SVG/静态 HTML（有限子集）
- parser/normalizer D3 深度合同：namespace/localTag、style block 规则、`> + ~` 组合符、attr operators、pseudo classes、`!important` 级联、clipPath/mask/use、transform 继承矩阵、numeric entity 解码、content sniffing、HTML 容错解析
- 导入提升层会跳过非可渲染定义子树（`defs/symbol/clipPath/mask/...`），避免字形定义被误渲染到画布左上角
- 长尾 CSS 语义扩展：`var()` 自定义属性级联与 fallback、`:nth-last-child`、`:first/last/only-of-type`、`:nth-of-type`、`:nth-last-of-type`、`:lang`、`:is/:where`、`:not()` 多项选择器
- 语义提升与能力标注（启发式实现）
- 基础编辑操作（选中、移动、删除、改文本、promote/group）以及多选布局整理（对齐、分布）
- SVG/HTML 导出与重导入 smoke 验证
- SVG 导出已加入无样式 shape 线框兜底（避免浏览器默认黑填充导致预览失真）
- compile/build/smoke/test/acceptance 闭环（含 desktop 四区联动 smoke）
- desktop GUI shell 可执行窗口生命周期与发布壳产物生成（`desktop:bundle`）
- desktop 本地 GUI runtime 可执行导入/选择/编辑/移动/导出（`desktop:gui`）
- desktop pilot CLI 可执行基本文件工作流（打开、编辑、保存项目、导出）

## 2. 弱支持/受限支持

- degraded input：以 honest labeling 与块级操作为主
- HTML：以 static + inline SVG 为主；dynamic HTML 支持 `limited/snapshot` 导入，其中 `snapshot` 为只读策略
- 视觉等价：已接入 `resvg` 渲染比较主路径，当前 roundtrip smoke 样例已通过 EQ-L2 阈值（`normalizedPixelDiff=0`）
- desktop：已具备可操作工作台 + GUI shell 发布壳 + pilot CLI 调试链路
- 性能基线：已生成 `docs/audit/performance_baseline_report.json`（导入/编辑/roundtrip 三项基线）
- 复杂真实样例稳定性：已生成 `docs/audit/real_sample_stability_report.json`（real/weak_real 子集）
- store 分发自动化：已生成 `artifacts/distribution/distribution-manifest.json` 与 `upload-queue.json`（dry-run）
- 外部凭据发布 CI：已提供 `.github/workflows/store_publish.yml` + `publish:store:ci`，由 secrets 驱动

## 3. 当前未补齐

- parser/normalizer 的更深层扩展语义覆盖（如复杂 filter/mask blend 链、完整 CSS4 选择器）
- dynamic HTML 全语义编辑（`snapshot` 只读闭环已完成，但不等于 full editable）
- 签名发布审批流与多商店策略编排（当前已具备凭据发布 CI 基线）
