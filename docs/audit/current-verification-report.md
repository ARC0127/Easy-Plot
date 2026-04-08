# 当前验证报告

- Status: audit
- Primary Source: `scripts/smoke_*.cjs`, `scripts/build_desktop_release.cjs`, `scripts/build_release_assets.cjs`, `scripts/build_store_distribution.cjs`, `scripts/publish_store_distribution.cjs`, `scripts/performance_baseline_report.cjs`, `scripts/real_sample_stability_report.cjs`, `scripts/family_acceptance_report.cjs`, `scripts/fixture_authenticity_audit.cjs`, `npm run typecheck:all`, command outputs from 2026-04-03
- Last Verified: 2026-04-08
- Verification Mode: smoke rerun + typecheck rerun + test rerun + acceptance rerun

## DEBUG_VIBE_CORE 运行头

- `DEBUG_VIBE_CORE: ON`
- `VIBE: M3`
- `HCP: ON`

## 1. MR 与 CL

- MR: `npm run smoke:ir-schema`
- CL: `npm run typecheck:all && npm run build:all && npm run smoke:all && npm run test:all && npm run acceptance:family`

## 2. Regression 记录

- Baseline (historical): `docs/audit/coding_engine_review.md` 中历史 closure 记录
- Main (current rerun): 本报告中的 2026-04-02 全量重跑结果
- Secondary (acceptance baseline): `docs/audit/family_acceptance_report.json`

## 3. 验证状态表（verification_status_table）

| Check | Status | Notes |
| --- | --- | --- |
| typecheck all | pass | `tsc` 环境已补齐，compile 级闭环完成 |
| build all | pass | 含新 `apps/desktop` |
| schema smoke | pass | validator 行为符合预期 |
| import smoke | pass | 两类样例导入通过 |
| editor smoke | pass | 选择/编辑/验证链路通过 |
| constraints-fixtures smoke | pass | constraints 与 fixture registry 可执行 |
| roundtrip smoke | pass | `rendered_svg_resvg` 主路径，`visualPass=true`，`rasterDiffPass=true`，`normalizedPixelDiff=0.006112289152421084` |
| fixture authenticity smoke | pass | `structuralPass=true`，`authenticityPass=true`（`nonSyntheticRatio=0.36538461538461536 >= 0.35`） |
| desktop smoke | pass | 四区联动可操作（导入/命中选择/移动/文本编辑/多选提升） |
| desktop pilot smoke | pass | 可执行 `desktop:pilot` 命令流（打开/编辑/保存项目/导出） |
| desktop shell smoke | pass | 可执行窗口生命周期、bridge 调用、GUI 壳文档渲染与 release bundle 产物验证 |
| desktop bundle | pass | `desktop:bundle` 可生成 `artifacts/desktop_release_bundle/index.html + shell-manifest.json` |
| release assets smoke | pass | 已生成 `release_notes`、`version-manifest`、`versioned schema`、`supported/unsupported/limitations`、Linux 安装包归档 |
| store distribution smoke | pass | 已生成 distribution manifest、upload queue、stable/canary/preview 三通道 channel manifests 与 payload hash 校验 |
| store publish CI smoke | pass | `dry_run` 模式已生成 `store_publish_ci_report`，并完成 channel readiness 校验 |
| performance baseline smoke | pass | 已生成性能基线报告（import/editor/roundtrip 三项阈值通过） |
| real sample stability smoke | pass | 已生成 `real_sample_stability_report`，`real+weak_real` 子集 19 个样例全部通过阈值 |
| snapshot closure smoke | pass | `smoke:snapshot-closure` 验证 snapshot 在 save/load 与 export/reimport 后仍保持只读边界 |
| tests all | pass | unit/integration/e2e/visual 基础用例通过 |
| family acceptance | pass | 已生成 6 family 报告，`overallPass=true` |

## 4. 结论

- 当前状态升级为“compile/build/smoke/tests/acceptance 报告全部可执行且 family-wise gate 已通过”。
- 已完成本轮主阻塞指标修复：`panel_detection_recall` 与 `reimport_interaction_retention_rate` 在 6 个 family 均达到当前阈值。
- D3 已完成收口并通过回归：parser/normalizer 已覆盖 namespace/localTag、style block、`> + ~` 组合符、attr operators、pseudo classes、`!important` 级联、clipPath/mask/use、transform 继承、numeric entity 解码、content sniffing 与 HTML 容错解析。
- 长尾 CSS 语义已增强：`var()` 自定义属性链与 fallback、`:nth-last-child`、`*-of-type`、`:lang`、`:is/:where`、`:not` 多项选择器已纳入单测回归。
- desktop 已达到“GUI 壳可运行”状态：`DesktopAppShell` 与 `desktop:bundle` 可生成可打开的四区窗口壳文档。
- D7 已完成收口：`DesktopAppShell` 已提供窗口生命周期、bridge 命令通道与 release bundle（`index.html + shell-manifest.json`）能力。
- D10 导出保真度与视觉阈值主阻塞已转绿：roundtrip smoke `visualPass=true`，`rasterDiffPass=true`，`normalizedPixelDiff=0.006112289152421084`。
- D4 已完成收口：snapshot 会话只读边界、save/load 继承、export/reimport 闭环均已通过证据验证。
- D8 已完成并转绿：fixture/provenance/ground_truth/package-data 四账一致且真实性比例达阈值。
- Section 16 发布资产已补齐：release notes、version manifest、versioned schema、安装包归档均可生成并校验。
- Section 13.5 性能证据已补齐：性能基线报告已可复现生成并通过当前阈值。
- 复杂真实样例稳定性与 store 分发 staging 自动化已补齐并纳入 smoke 回归。
- 外部凭据发布 CI 基线已补齐：`publish:store:ci` + `.github/workflows/store_publish.yml`。
- 当前后续增强项为：更深层 SVG/CSS 语义覆盖（滤镜链/完整 CSS4）与签名审批流。
