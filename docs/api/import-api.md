# Import APIs

- Status: gap
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 7, 12.1), `packages/core-parser|core-normalizer|importer-adapters|core-lifter|core-capability/src/*`
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. 合同映射

| API (Spec) | 目标语义 | 当前入口路径 | 可执行性 | 主要 gap |
| --- | --- | --- | --- | --- |
| `parseDocument(input)` | 解析 SVG/HTML | `packages/core-parser/src/parseDocument.ts` | yes | D3 深度合同已满足；后续是扩展级语义增强（非 D3 阻塞） |
| `normalizeDocument(parsed)` | style/transform/bbox 归一化 | `packages/core-normalizer/src/normalizeDocument.ts` | yes | D3 深度合同已满足，新增 `var()` 与 advanced pseudo；后续是更深层扩展语义增强（非 D3 阻塞） |
| `classifyFamily(normalized)` | 输出 family class | `packages/importer-adapters/src/classifyFamily.ts` | yes | 分类规则偏启发式 |
| `runAdapters(normalized, family)` | 输出 semantic hints | `packages/importer-adapters/src/runAdapters.ts` | yes | adapter 准确率未达正式评估 |
| `liftToIR(normalized, hints)` | semantic lift | `packages/core-lifter/src/liftToIR.ts` | yes | lift 精度和覆盖尚未 family-wise 验收 |
| `assignCapabilities(lifted)` | 显式能力赋值 | `packages/core-capability/src/assignCapabilities.ts` | yes | 需要更完整能力准确率报告 |
| `buildProject(...)` | 构建 Project | `packages/core-lifter/src/buildProject.ts` | yes | 与未来桌面壳集成未完成 |

## 2. 责任归属

- Import pipeline 实现主责：`core-parser`、`core-normalizer`、`importer-adapters`、`core-lifter`、`core-capability`。
- 验收主责：`testing-fixtures` 与 `testing-metrics`。

## 3. HTML mode 现状

- `strict_static`：检测到动态信号即抛 `ERR_DYNAMIC_HTML_NOT_SUPPORTED`。
- `limited`：允许导入并记录动态信号告警（当前 `editor-state#importIntoSession` 默认用于 HTML）。
- `snapshot`：已在 `editor-state#importIntoSession(..., { htmlMode: 'snapshot' })` 落地闭环策略（会话只读门禁 + 元数据标签 + save/load 继承 + export/reimport 再导入验证）。

## 4. 证据命令

- `npm run smoke:import-pipeline`
