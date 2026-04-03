# Export / Roundtrip APIs

- Status: gap
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 10, 12.4), `packages/core-export-svg|core-export-html|testing-metrics/src/roundtrip/*`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + smoke rerun

## 1. 合同映射

| API (Spec) | 当前入口 | 可执行性 | gap 说明 |
| --- | --- | --- | --- |
| `exportSVG(project, options?)` | `packages/core-export-svg/src/exportSVG.ts` | yes | 当前 smoke 样例已通过 EQ-L2；真实复杂样例仍需持续回归 |
| `exportHTML(project, options?)` | `packages/core-export-html/src/exportHTML.ts` | yes | HTML 以 inline SVG 容器方式为主 |
| `noOpRoundTrip(project)` | `packages/testing-metrics/src/roundtrip/noOpRoundTrip.ts` | yes | 当前签名为 `noOpRoundTrip(project, source)`，含结构保留与降级告警 |
| `reimportExportedArtifact(artifact)` | `packages/testing-metrics/src/roundtrip/reimportExportedArtifact.ts` | yes | 当前实现以测试/验证导向为主，生产封装仍待增强 |

## 2. 导出报告合同

- `exportSVG` 返回：
- `artifactPath`
- `warnings`
- `stabilitySummary`

当前实现已提供上述字段，`artifactPath` 在 smoke 中为虚拟/空路径。

## 3. 证据命令

- `npm run smoke:roundtrip-pipeline`

当前证据要点（2026-04-02）：
- `comparisonMode=rendered_svg_resvg`（已不是 `approx_markup_diff` 主路径）
- `normalizedPixelDiff=0`，低于当前 `0.025` 阈值，`visualPass=true`
