# 复杂真实样例稳定性报告

- Status: audit
- Primary Source: `scripts/real_sample_stability_report.cjs`, `fixtures/fixture_provenance_matrix.csv`, `packages/testing-fixtures/data/*`
- Last Verified: 2026-04-08
- Verification Mode: smoke rerun

## 1. 数据集范围

- fixture count: `19`
- tiers: `real + weak_real`

## 2. 总体结论

- overallPass: `true`
- overall visualPassRate: `1.0000`
- overall retentionPassRate: `1.0000`
- overall p95 normalizedPixelDiff: `0.000000`
- overall p05 retentionRate: `1.000000`

## 3. family 汇总

| Family | Count | visualPassRate | retentionPassRate | p95 pixelDiff | p05 retention | Pass |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `chart_family` | 3 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |
| `degraded_svg` | 2 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |
| `illustration_like` | 3 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |
| `llm_svg` | 4 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |
| `matplotlib` | 4 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |
| `static_html_inline_svg` | 3 | 1.0000 | 1.0000 | 0.000000 | 1.000000 | true |

## 4. 高风险样例（按 pixelDiff）

| Fixture | Family | normalizedPixelDiff | retentionRate | mode |
| --- | --- | ---: | ---: | --- |
| `mpl_001` | `matplotlib` | 0.000000 | 1.000000 | `rendered_svg_resvg` |
| `mpl_002` | `matplotlib` | 0.000000 | 1.000000 | `rendered_svg_resvg` |
| `mpl_003` | `matplotlib` | 0.000000 | 1.000000 | `rendered_svg_resvg` |
| `mpl_004` | `matplotlib` | 0.000000 | 1.000000 | `rendered_svg_resvg` |
| `chart_001` | `chart_family` | 0.000000 | 1.000000 | `rendered_svg_resvg` |

## 5. 产物

- JSON: `docs/audit/real_sample_stability_report.json`
