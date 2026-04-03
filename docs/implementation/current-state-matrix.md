# 当前实现状态矩阵

- Status: implemented
- Primary Source: repository `packages/*`, `scripts/*`, `fixtures/*`, smoke commands
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun + typecheck rerun

## 1. Package-by-package 状态

| Package | src files | dist files | smoke coverage | 状态 |
| --- | ---:| ---:| --- | --- |
| `ir-schema` | 24 | 70 | `smoke:ir-schema` | partial |
| `core-parser` | 7 | 21 | `smoke:import-pipeline` | partial |
| `core-normalizer` | 7 | 21 | `smoke:import-pipeline` | partial |
| `importer-adapters` | 8 | 24 | `smoke:import-pipeline` | partial |
| `core-lifter` | 6 | 18 | `smoke:import-pipeline` | partial |
| `core-capability` | 2 | 6 | `smoke:import-pipeline` | partial |
| `core-history` | 5 | 15 | `smoke:editor-pipeline` | partial |
| `core-constraints` | 11 | 33 | `smoke:constraints-fixtures` | partial |
| `core-export-svg` | 5 | 15 | `smoke:roundtrip-pipeline` | partial |
| `core-export-html` | 4 | 12 | `smoke:roundtrip-pipeline` | partial |
| `editor-state` | 9 | 27 | `smoke:editor-pipeline` | partial |
| `editor-canvas` | 5 | 15 | `smoke:editor-pipeline` | partial |
| `editor-tree` | 3 | 9 | `smoke:editor-pipeline` | partial |
| `editor-properties` | 2 | 6 | `smoke:editor-pipeline` | partial |
| `editor-import-report` | 2 | 6 | `smoke:editor-pipeline` | partial |
| `testing-fixtures` | 6 | 18 | `smoke:constraints-fixtures` | partial |
| `testing-metrics` | 10 | 30 | `smoke:roundtrip-pipeline` | partial |

## 2. 仓库级现状

- package 数量：17（核心模块骨架）
- desktop app：`apps/desktop` 已建立，包含 `main/preload/renderer`、`DesktopAppShell` 生命周期壳与 release bundle 生成
- tests：已建立 `tests/unit|integration|e2e|visual_regression`
- scripts（25）：`smoke_check.cjs`、`smoke_check.mjs`、`smoke_import_pipeline.cjs`、`smoke_editor_pipeline.cjs`、`smoke_constraints_fixtures.cjs`、`smoke_roundtrip_pipeline.cjs`、`smoke_desktop.cjs`、`smoke_desktop_pilot.cjs`、`smoke_desktop_shell.cjs`、`smoke_release_assets.cjs`、`smoke_store_distribution.cjs`、`smoke_store_publish_ci.cjs`、`performance_baseline_report.cjs`、`real_sample_stability_report.cjs`、`smoke_real_sample_stability.cjs`、`smoke_snapshot_closure.cjs`、`desktop_pilot_cli.cjs`、`build_desktop_release.cjs`、`build_release_assets.cjs`、`build_store_distribution.cjs`、`publish_store_distribution.cjs`、`family_acceptance_report.cjs`、`fixture_authenticity_audit.cjs`、`d8_bootstrap_fixtures.cjs`、`render_compare.py`
- fixtures（4 个核心文件 + data 子目录）：`fixtures/acceptance_thresholds.md`、`fixtures/fixture_family_matrix.csv`、`fixtures/fixture_provenance_matrix.csv`、`fixtures/ground_truth_schema.json`
- audit 文档：`docs/audit/coding_engine_review.md` 与本轮新增 audit 报告
- 发布资产：`artifacts/release_notes.md`、`artifacts/version-manifest.json`、`artifacts/installers/figure-editor-desktop-linux-x64.tar.gz`、`artifacts/versioned_schema/*`、`artifacts/distribution/*`
- fixture/ground truth 扩容：`matplotlib=10`、`chart_family=8`、`illustration_like=8`、`llm_svg=10`、`static_html_inline_svg=8`、`degraded_svg=8`

## 3. 风险显式项

- 跨包 `dist` 依赖密集，源码边界耦合偏高。
- parser/normalizer 的 D3 深度合同已收口并完成一轮长尾 CSS 语义扩展，但 parser/adapter/lifter 在更大真实样本上的精度证据仍需持续补强。
- exporter 视觉保真度在 roundtrip smoke 与 real/weak_real 稳定性报告均达阈值（`overall p95 normalizedPixelDiff=0`）。
- D8 真实性审计已转绿：`structuralPass=true`、`authenticityPass=true`，`nonSyntheticRatio=0.36538461538461536`。
- 性能基线与真实样例稳定性报告已脚本化，后续重点为扩大真实样例规模并持续回归。
- store 分发已具备凭据发布 CI 基线；后续重点为签名审批与多商店策略编排。
