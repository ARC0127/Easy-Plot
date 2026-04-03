# Project APIs

- Status: gap
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 12.2), `packages/ir-schema/src/*`, `packages/editor-state/src/projectStore.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 合同映射

| API (Spec) | 当前实现映射 | 当前状态 | gap 说明 |
| --- | --- | --- | --- |
| `createEmptyProject(init)` | `packages/editor-state/src/actions/projectActions.ts` | yes | 当前为本地文件实现，尚无跨平台适配层 |
| `loadProject(path)` | `packages/editor-state/src/actions/projectActions.ts` | yes | 依赖本地文件系统；云端/远程存储未支持 |
| `saveProject(project, path)` | `packages/editor-state/src/actions/projectActions.ts` | yes | 保存前执行 schema/invariant 校验 |
| `archiveOriginalSource(project, source)` | `packages/editor-state/src/actions/projectActions.ts` | yes | 当前按 `sourceId` 去重/覆盖 |
| `validateProject(project)` | `packages/ir-schema/src/validators/schemaValidator.ts` | yes | runtime schema 校验深度仍需增强 |

## 2. 当前可用替代入口

- 创建空项目/读写项目：
- `createEmptyProject`
- `loadProject`
- `saveProject`
- `archiveOriginalSource`
- 会话初始化：`packages/editor-state/src/projectStore.ts#createEditorSession`
- schema/invariant/capability 校验：
- `validateProject`
- `validateInvariants`
- `validateCapabilityConflicts`

## 3. 责任归属与剩余 gap

- 当前 Project 生命周期 API 已在 `editor-state` 暴露。
- 剩余 gap：缺少版本迁移器、跨平台存储适配与冲突恢复策略。
