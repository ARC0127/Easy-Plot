# 发布说明

- Status: implemented
- Primary Source: `scripts/build_release_assets.cjs`, `artifacts/release_notes.md`, `artifacts/version-manifest.json`
- Last Verified: 2026-04-09
- Verification Mode: smoke rerun

本文件由 `release:assets` 自动刷新，正式发布说明如下。

# Easy Plot Release Notes v0.0.2

- Generated At: 2026-04-09T02:18:21.338Z
- Schema Version: 1.0.0-mvp

## Highlights

- D3 parser/normalizer 深度合同已收口并通过回归。
- D4 snapshot 独立闭环已完成（save/load + export/reimport）。
- D7 desktop GUI 壳与发布壳产物已完成。
- D8 fixture/ground truth 真实性门禁已通过（nonSyntheticRatio >= 0.35）。
- 新增 store-grade 分发自动化（channel staging + upload queue manifest）。
- 新增复杂真实样例稳定性报告（real/weak_real 子集）。
- 新增长尾 CSS 语义扩展（var() + advanced pseudo）与 store 凭据发布 CI 基线。

## Release Assets

- desktop_release_bundle: `artifacts/desktop_release_bundle/index.html` + `shell-manifest.json`
- installer package: `artifacts/installers/easy-plot-desktop-linux-x64.tar.gz`
- version manifest: `artifacts/version-manifest.json`
- supported/unsupported/limitations assets: `artifacts/*.json|*.md`

## Notes

- 本版本为文档重建与闭环验证版本，面向仓库内验收与工程审计。
