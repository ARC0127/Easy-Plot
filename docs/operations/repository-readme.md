# 开发入口与常用命令

- Status: implemented
- Primary Source: repository `package.json`, `scripts/*`
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun

## 1. 文档入口

- 总入口：`docs/index.md`
- 当前验证报告：`docs/audit/current-verification-report.md`

## 2. 常用命令

- `npm run typecheck:all`
- `npm run build:all`
- `npm run smoke:all`
- `npm run test:all`
- `npm run acceptance:family`
- `npm run smoke:ir-schema`
- `npm run smoke:import-pipeline`
- `npm run smoke:editor-pipeline`
- `npm run smoke:constraints-fixtures`
- `npm run smoke:roundtrip-pipeline`
- `npm run smoke:fixture-authenticity`
- `npm run smoke:release-assets`
- `npm run smoke:store-distribution`
- `npm run smoke:store-publish-ci`
- `npm run smoke:performance-baseline`
- `npm run smoke:real-sample-stability`
- `npm run smoke:desktop-pilot`
- `npm run smoke:desktop-shell`
- `npm run smoke:desktop-gui`
- `npm run desktop:pilot`
- `npm run desktop:gui`
- `npm run desktop:bundle`
- `npm run release:assets`
- `npm run release:distribution`
- `npm run publish:store:dry-run`
- `npm run publish:store:ci`

## 3. 已知环境限制

- `tsc` 环境已补齐，compile 级验证可运行。
- roundtrip 视觉比较已接入 `resvg` 主路径；当前 smoke 样例阈值已通过（`normalizedPixelDiff=0`），复杂样例仍需持续回归。
- parser/normalizer 已新增一轮长尾 CSS 语义增强（`var()` + advanced pseudo），并纳入 unit 回归。
- desktop 已提供 GUI shell 发布壳入口（`desktop:bundle`）、本地可操作 GUI runtime（`desktop:gui`）与 pilot CLI 调试入口（`desktop:pilot`）。
- D8 真实性审计已接入 `smoke:fixture-authenticity`，当前已通过（`structuralPass=true`、`authenticityPass=true`）。
- Section 16 发布资产已接入 `smoke:release-assets`，可生成 release notes/version manifest/安装包归档。
- store-grade 分发 staging 自动化已接入 `smoke:store-distribution`，可生成 channel manifests 与 upload queue（dry-run）。
- store 凭据发布 CI readiness 已接入 `smoke:store-publish-ci`，可生成 `store_publish_ci_report`。
- Section 13.5 性能基线已接入 `smoke:performance-baseline`，可生成性能基线报告。
- 复杂真实样例稳定性报告已接入 `smoke:real-sample-stability`，覆盖 `real + weak_real` 子集（19 fixtures）。

## 4. 变更纪律

- 文档与代码变更都必须更新对应审计记录。
- 不允许仅更新文档声明而没有可追溯证据。
