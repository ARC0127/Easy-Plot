# Store 发布 CI 报告

- Status: audit
- Primary Source: `scripts/publish_store_distribution.cjs`, `artifacts/distribution/*`, CI workflow
- Last Verified: 2026-04-08
- Verification Mode: smoke rerun

## 1. 总体结论

- mode: `dry_run`
- channelCount: `3`
- overallPass: `true`
- credentialsProvided: `false`

## 2. 通道结果

| Channel | Mode | Status |
| --- | --- | --- |
| `stable_linux_x64` | `dry_run` | `ready` |
| `canary_linux_x64` | `dry_run` | `ready` |
| `web_bundle_preview` | `dry_run` | `ready` |

## 3. 产物

- JSON: `docs/audit/store_publish_ci_report.json`
- Markdown: `docs/audit/store-publish-ci.md`
