# Family 验收摘要

- Status: audit
- Primary Source: `docs/audit/family_acceptance_report.json`, `npm run acceptance:family`
- Last Verified: 2026-04-02
- Verification Mode: acceptance rerun

## 1. 总体状态

- `overallPass=true`
- 已覆盖 family：`matplotlib`、`chart_family`、`illustration_like`、`llm_svg`、`static_html_inline_svg`、`degraded_svg`

## 2. family 结果

| Family | Pass | 主要失败指标 |
| --- | --- | --- |
| `matplotlib` | true | 无 |
| `chart_family` | true | 无 |
| `illustration_like` | true | 无 |
| `llm_svg` | true | 无 |
| `static_html_inline_svg` | true | 无 |
| `degraded_svg` | true | 无 |

## 3. 结论

- fixture/ground truth 规模已达规范最小数量。
- family-wise 验收链路已实现并可重复执行。
- 本轮失败 family（`matplotlib`、`llm_svg`、`static_html_inline_svg`、`degraded_svg`）已完成定向修复，`panel_detection_recall` 与 `reimport_interaction_retention_rate` 不再阻塞。
- 该结论覆盖 M1-M7 family-wise gate；D8 真实性门禁已在 `docs/audit/fixture-authenticity-audit.md` 中转绿。
