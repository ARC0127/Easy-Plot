# Import Capability 报告

- Status: implemented
- Primary Source: `packages/core-parser/src/*`, `packages/core-normalizer/src/*`, `packages/importer-adapters/src/*`, `scripts/smoke_import_pipeline.cjs`, `docs/audit/family_acceptance_report.json`
- Last Verified: 2026-04-02
- Verification Mode: smoke rerun + acceptance rerun

## 1. Family 能力分级

| Family | 导入可执行 | 语义提升 | 典型编辑能力 | 级别 |
| --- | --- | --- | --- | --- |
| `matplotlib` | yes | yes | panel/legend/text 高可编辑 | supported |
| `chart_family` | yes | yes | 语义对象可编辑 | supported |
| `illustration_like` | yes | yes | 组/形状/文本可编辑 | supported |
| `llm_svg` | yes | yes | 文本与块级能力混合 | supported |
| `static_html_inline_svg` | yes | yes | static + inline SVG 可编辑 | supported |
| `degraded_svg` | yes | partial | 以 honest labeling + 块级操作为主 | weak_supported |

## 2. HTML mode 能力

| Mode | 语义 | 当前行为 |
| --- | --- | --- |
| `strict_static` | 不允许动态信号 | 触发 `ERR_DYNAMIC_HTML_NOT_SUPPORTED` |
| `limited` | 允许导入，保留告警 | 会话可编辑 |
| `snapshot` | 快照只读 | 会话只读门禁 + save/load 继承 + export/reimport 闭环 |

## 3. 当前结论

- Import pipeline 六个 family 均可执行并通过基础 smoke。
- family-wise acceptance 已通过（`overallPass=true`）。
- `degraded_svg` 仍按 weak support 口径管理，不伪装为 full editable。
