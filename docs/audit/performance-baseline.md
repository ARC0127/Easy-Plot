# 性能基线报告

- Status: audit
- Primary Source: `scripts/performance_baseline_report.cjs`, `scripts/smoke_import_pipeline.cjs`, `scripts/smoke_editor_pipeline.cjs`, `scripts/smoke_roundtrip_pipeline.cjs`
- Last Verified: 2026-04-09
- Verification Mode: smoke rerun

## 1. 总体结论

- overallPass: `true`
- iterations: `3`

## 2. 指标结果

| Check | Median (ms) | Threshold (ms) | Pass |
| --- | ---: | ---: | --- |
| `import_pipeline_latency` | 53.59 | 2500 | true |
| `editor_pipeline_latency` | 66.14 | 2500 | true |
| `roundtrip_pipeline_latency` | 272.39 | 3500 | true |

## 3. 产物

- JSON: `docs/audit/performance_baseline_report.json`
