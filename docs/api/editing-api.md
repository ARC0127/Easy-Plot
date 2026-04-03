# Editing APIs

- Status: gap
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 8, 12.3), `packages/editor-state/src/*`, `packages/core-history/src/*`, `packages/editor-canvas/src/interactions.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + smoke rerun

## 1. 合同映射

| API (Spec) | 当前入口 | 可执行性 | gap 说明 |
| --- | --- | --- | --- |
| `selectObject` | `packages/editor-state/src/selectionStore.ts#selectObject` | yes | 作用在 session state，不是纯 Project API |
| `multiSelectObjects` | `packages/editor-state/src/selectionStore.ts#multiSelectObjects` | yes | 同上 |
| `moveObject` | `packages/core-history/src/applyOperation.ts` + `MOVE_OBJECT` | yes | 通过 operation 驱动 |
| `resizeObject` | `packages/editor-canvas/src/interactions.ts#resizeObject` | yes | 参数和合同一致性待收敛 |
| `setAnchor` | `packages/core-constraints/src/anchors/setAnchor.ts` | yes | UI 入口为 `editor-state/src/actions/constraintActions.ts` |
| `deleteObject` | `packages/core-history/src/applyOperation.ts` + `DELETE_OBJECT` | yes | 删除后引用清理为基础版 |
| `editTextContent` | `packages/core-history/src/applyOperation.ts` + `EDIT_TEXT_CONTENT` | yes | 未支持时抛 `ERR_TEXT_EDIT_UNSUPPORTED` |
| `promoteSelection` | `packages/core-history/src/applyOperation.ts` + `PROMOTE_SELECTION` | yes | 已写 manual edit 与 operation log |
| `overrideRole` | `packages/core-history/src/applyOperation.ts` + `OVERRIDE_ROLE` | yes | 行为可用，精细语义规则待补 |
| `groupObjects` | `packages/core-history/src/applyOperation.ts` + `GROUP_OBJECTS` | yes | 目前通过 manual group 语义构建 |
| `ungroupObject` | `packages/core-history/src/applyOperation.ts` + `UNGROUP_OBJECT` | yes | 组关系复杂场景待验证 |

## 2. 责任归属

- 编辑核心：`core-history` + `editor-state`
- 交互映射：`editor-canvas`
- 约束联动：`core-constraints`

## 3. 证据命令

- `npm run smoke:editor-pipeline`
- `npm run smoke:constraints-fixtures`
