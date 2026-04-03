# 发布流程（第一代）

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 16, 18), `scripts/build_release_assets.cjs`, `scripts/smoke_release_assets.cjs`, `scripts/build_store_distribution.cjs`, `scripts/smoke_store_distribution.cjs`, `artifacts/*`
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun

## 1. 发布前检查清单

- schema/API/acceptance 文档齐备
- fixture 与 ground truth 满足最低规模要求
- family-wise 指标与 global gate 报告可复现
- 支持/不支持/弱支持清单已公开
- 已知限制和风险已文档化

## 2. 发布资产

- 生成命令：`npm run release:assets` + `npm run release:distribution`
- 校验命令：`npm run smoke:release-assets` + `npm run smoke:store-distribution` + `npm run smoke:store-publish-ci`
- 版本化 schema：`artifacts/versioned_schema/project.schema.1.0.0-mvp.json`
- release notes：`artifacts/release_notes.md`
- supported families list：`artifacts/supported_families.json`
- unsupported cases list：`artifacts/unsupported_cases.json`
- known limitations list：`artifacts/known_limitations.md`
- version manifest：`artifacts/version-manifest.json`
- 可运行应用构件：`artifacts/desktop_release_bundle/index.html + shell-manifest.json`
- Linux 安装包归档：`artifacts/installers/figure-editor-desktop-linux-x64.tar.gz`
- store 分发清单：`artifacts/distribution/distribution-manifest.json`
- store upload queue：`artifacts/distribution/upload-queue.json`
- 分渠道 payload：`artifacts/distribution/channels/*`
- 凭据发布 CI 报告：`docs/audit/store_publish_ci_report.json`

## 3. 当前结论

- 当前仓库已具备 Section 16 所需发布资产闭环（含 release notes/version manifest/安装包归档）。
- 当前仓库已具备 store-grade 分发 staging 自动化与凭据发布 CI 通道（secrets 驱动）。
