# Store 分发自动化与凭据发布 CI

- Status: implemented
- Primary Source: `scripts/build_store_distribution.cjs`, `scripts/smoke_store_distribution.cjs`, `scripts/publish_store_distribution.cjs`, `scripts/smoke_store_publish_ci.cjs`, `.github/workflows/store_publish.yml`, `artifacts/distribution/*`
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun

## 1. 目标

- 在仓库内形成可重复执行的“商店级分发预打包”链路。
- 输出多 channel 分发清单、分发 payload 与 upload queue。
- 将外部凭据发布与仓库内可验证链路分离，避免伪造“已上架”结论。

## 2. 命令与产物

- 命令：
- `npm run release:distribution`
- `npm run smoke:store-distribution`
- `npm run smoke:store-publish-ci`
- `npm run publish:store:dry-run`
- `npm run publish:store:ci`
- 产物：
- `artifacts/distribution/distribution-manifest.json`
- `artifacts/distribution/upload-queue.json`
- `artifacts/distribution/channels/*/channel-manifest.json`
- `artifacts/distribution/channels/*/payload/*`
- `docs/audit/store_publish_ci_report.json`

## 3. 当前结论

- 已具备 store-grade staging 自动化：stable/canary/preview 三通道均可生成并通过 hash 校验。
- 已具备凭据发布 CI 通道：`credentialed_publish=true` 的 workflow_dispatch 可触发 `publish:store:ci`。
- 本地 smoke 仅执行 dry-run 与 channel readiness 校验；真实上传依赖 CI secrets（`STORE_PUBLISH_ENDPOINT`、`STORE_PUBLISH_TOKEN`）。
