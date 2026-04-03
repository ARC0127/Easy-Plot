# 系统架构与数据流

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 5)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 三层真源设计

- `Original input`: 外部 SVG/HTML，归档与追溯用途。
- `Figure IR`: 内部长期真源。
- `Export artifacts`: 导出的 SVG/HTML。

编辑闭环必须围绕 `project.figure.json`，不围绕外部文件源码 patch。

## 2. 核心数据流

`parse -> normalize -> classify family -> run adapters -> semantic lift -> assign capabilities -> build project -> edit -> export -> verify round-trip/reimport`

## 3. 架构原则

- semantic object 优先于裸 DOM 节点。
- imported object 必须有 provenance。
- capability 必须显式赋值，不允许隐式推断替代。
- layout 优先 anchor + offset，而非纯绝对坐标。
- manual promote/override 是一等机制。
- degraded input 必须 honest labeling，不伪造能力。

## 4. 当前实现映射

- parse: `packages/core-parser/src/parseDocument.ts`
- normalize: `packages/core-normalizer/src/normalizeDocument.ts`
- classify/adapters: `packages/importer-adapters/src/*`
- lift/build project: `packages/core-lifter/src/*`
- capability: `packages/core-capability/src/assignCapabilities.ts`
- edit state/history: `packages/editor-state/src/*`, `packages/core-history/src/*`
- export: `packages/core-export-svg/src/exportSVG.ts`, `packages/core-export-html/src/exportHTML.ts`
- verify: `packages/testing-metrics/src/*`
