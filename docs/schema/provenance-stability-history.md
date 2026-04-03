# Provenance / Stability / History 合同

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 6.9-6.15), `packages/core-history/src/*`, `packages/core-lifter/src/provenance/buildProvenance.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. Provenance 最小字段

- `originFileKind`
- `originSourceId`
- `originNodeIds`
- `originSelectorOrPath`
- `originBBox`
- `originStyleSnapshot`
- `liftedBy`
- `liftConfidence`
- `degradationReason`

## 2. StabilityProfile 最小字段

- `exportStabilityClass`
- `requiresSnapshotRendering`
- `reimportExpectation`
- `equivalenceTarget`

## 3. ManualEditRecord 最小字段

- `editId`
- `kind`
- `timestamp`
- `before`
- `after`
- `reason`

## 4. HistoryState 合同

- `undoStack`
- `redoStack`
- `operationLog`

## 5. 当前实现证据

- provenance 构建：`packages/core-lifter/src/provenance/buildProvenance.ts`
- 手动编辑记录：`packages/core-history/src/manualEdits.ts`
- undo/redo/log：`packages/core-history/src/undoRedo.ts`
- 编辑应用：`packages/core-history/src/applyOperation.ts`

## 6. 当前 gap

- 历史记录结构可用，但尚未建立面向真实 fixture 的长期稳定性回归数据库。
