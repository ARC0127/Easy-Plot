# 证据台账（Evidence Ledger）

- Status: audit
- Primary Source: local command executions on 2026-04-03 (`typecheck/build/smoke/test/acceptance/fixture-authenticity/release-assets/store-distribution/store-publish-ci/performance-baseline/real-sample-stability`)
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun + typecheck rerun + test rerun + acceptance rerun

## 1. 命令与结果

| Command | Exit | 结果摘要 |
| --- | ---:| --- |
| `npm install --save-dev typescript @types/node` | 0 | 完成 `tsc` 运行环境补齐 |
| `npm install --save-dev @resvg/resvg-js pngjs @types/pngjs` | 0 | 完成 Node 内渲染视觉对比依赖补齐 |
| `npm run typecheck:all` | 0 | compile 级闭环通过（含 desktop） |
| `npm run build:all` | 0 | 所有 packages + desktop 编译通过 |
| `npm run smoke:all` | 0 | 全量 smoke 链路通过（含 release/store/performance/real-sample/snapshot） |
| `npm run smoke:ir-schema` | 0 | PASS，校验器能识别能力冲突与 proxy text 违规 |
| `npm run smoke:import-pipeline` | 0 | PASS，`matplotlib`/`static_html_inline_svg` 样例可导入 |
| `npm run smoke:editor-pipeline` | 0 | PASS，基础编辑链路可执行 |
| `npm run smoke:constraints-fixtures` | 0 | PASS，约束与 fixture registry 可执行 |
| `npm run smoke:roundtrip-pipeline` | 0 | PASS，roundtrip 链路可跑，视觉等价已通过（`normalizedPixelDiff=0`） |
| `npm exec -- node scripts/d8_bootstrap_fixtures.cjs` | 0 | PASS，批量补齐 52 个 ground truth 的 `fixtureId/family/provenanceRef`，并生成 `fixture_provenance_matrix.csv` |
| `npm run smoke:fixture-authenticity` | 0 | PASS，结构与真实性阈值均通过（`nonSyntheticRatio=0.36538461538461536`） |
| `npm run smoke:desktop` | 0 | PASS，desktop 四区联动 smoke 通过 |
| `npm run smoke:desktop-shell` | 0 | PASS，desktop 生命周期、bridge、release bundle 壳能力通过 |
| `npm run desktop:bundle` | 0 | PASS，生成 `artifacts/desktop_release_bundle/index.html` 与 `shell-manifest.json` |
| `npm run smoke:release-assets` | 0 | PASS，生成并校验 release notes/version manifest/versioned schema/installer 资产 |
| `npm run smoke:store-distribution` | 0 | PASS，生成并校验 distribution manifest/upload queue/三通道 channel manifests |
| `npm run smoke:store-publish-ci` | 0 | PASS，生成 `store_publish_ci_report` 并完成 channel readiness 校验 |
| `npm run smoke:performance-baseline` | 0 | PASS，生成性能基线报告（import/editor/roundtrip）并通过阈值 |
| `npm run smoke:real-sample-stability` | 0 | PASS，生成真实样例稳定性报告（real+weak_real 子集 19 fixtures）并通过阈值 |
| `npm run smoke:snapshot-closure` | 0 | PASS，snapshot save/load + export/reimport 独立闭环通过 |
| `npm run test:all` | 0 | unit/integration/e2e/visual 基础测试通过 |
| `npm run acceptance:family` | 0 | 生成 6 family 报告，`overallPass=true` |

## 2. 关键观测

- roundtrip 中 `visualPass=true`、`retentionPass=true`，视觉与交互保留均通过当前阈值。
- 当前 `diffMode=rendered_svg_resvg`，说明已进入稳定渲染比较路径；不再依赖 `approx_markup_diff` 作为主路径。
- 本轮 D3 收口（namespace/localTag、style block、`> + ~` 组合符、attr operators、pseudo classes、`!important` 级联、inline style 复杂值解析、clip/mask/use、transform 继承、numeric entity 解码、content sniffing、HTML 容错解析）已通过新增单测与全链路回归。
- 长尾 CSS 语义增强已落地：`var()` 自定义属性级联/fallback、`:nth-last-child`、`*-of-type`、`:lang`、`:is/:where`、`:not` 多项选择器。
- fixture 与 ground truth 已扩充到规范最小规模（10/8/8/10/8/8）。
- D8 真实性审计已形成脚本化证据：`fixtures/fixture_provenance_matrix.csv` + `docs/audit/fixture_authenticity_report.json`。
- D8 当前口径为 pass：family-wise gate 与真实性子门禁均通过（`authenticityPass=true`）。
- Section 16 发布资产已形成脚本化闭环：`scripts/build_release_assets.cjs` + `scripts/smoke_release_assets.cjs`。
- store-grade 分发 staging 自动化已形成脚本化闭环：`scripts/build_store_distribution.cjs` + `scripts/smoke_store_distribution.cjs`。
- store 凭据发布 CI readiness 已形成脚本化闭环：`scripts/publish_store_distribution.cjs` + `scripts/smoke_store_publish_ci.cjs` + `.github/workflows/store_publish.yml`。
- Section 13.5 性能基线已形成脚本化闭环：`scripts/performance_baseline_report.cjs` + `docs/audit/performance_baseline_report.json`。
- 复杂真实样例稳定性已形成脚本化闭环：`scripts/real_sample_stability_report.cjs` + `docs/audit/real_sample_stability_report.json`。
- family-wise 报告已可自动生成并通过 global gate（当前 `overallPass=true`）。

## 3. 结论

- 当前证据足以支撑“文档重建+实现现状审计”。
- 当前证据已支撑“family-wise 正式验收通过”与“D3/D4/D7/D8 完成转绿”。
- 当前证据已支撑“Section 16 发布资产闭环”与“Section 13.5 性能证据闭环”。
- 当前仓库内可执行缺口已清零；后续增强项为更深层 SVG/CSS 语义覆盖与签名审批流。
