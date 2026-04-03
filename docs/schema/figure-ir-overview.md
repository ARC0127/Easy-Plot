# Figure IR 顶层结构

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 6), `packages/ir-schema/src/project.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 顶层 contract

`Project` 结构包含：

- `schemaVersion`
- `project.projectId/createdAt/updatedAt`
- `sourceMode`
- `originalSources: OriginalSourceRef[]`
- `figure: Figure`
- `importRecords: ImportRecord[]`
- `history: HistoryState`
- `exportPolicy: ExportPolicy`
- `objects: Record<string, AnyObject>`

## 2. 核心类型

- `OriginalSourceRef`: `sourceId/kind/path/sha256/familyHint/importedAt`
- `Figure`: 画布与对象聚合关系、约束与元信息
- `ImportRecord`: 分类、提升成功/失败、unknown、atomic raster、指标
- `HistoryState`: `undoStack/redoStack/operationLog`
- `ExportPolicy`: `svg/html` 导出策略

## 3. 当前实现状态

- 入口：`packages/ir-schema/src/project.ts`
- `schemaVersion` 目前固定 `'1.0.0-mvp'`
- JSON schema 文件：`packages/ir-schema/src/json-schema/project.schema.json`
- 校验入口：`packages/ir-schema/src/validators/schemaValidator.ts`

## 4. 已知差异

- 规范的 `project.figure.json` 闭环语义已建模，但运行时链路仍以 smoke 样例为主。
- `schemaValidator` 当前以结构与 invariant 校验为主，完整 runtime schema 校验能力仍需持续增强。
