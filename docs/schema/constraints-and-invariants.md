# 约束系统与 Invariants

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 6.12, 6.16, 12.6), `packages/core-constraints/src/*`, `packages/ir-schema/src/validators/*`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 约束类型（冻结）

- `anchor_to_figure`
- `anchor_to_panel`
- `keep_inside_bounds`
- `align_left`
- `align_right`
- `align_top`
- `align_bottom`
- `center_horizontal`
- `center_vertical`
- `equal_spacing_horizontal`
- `equal_spacing_vertical`
- `lock_aspect_ratio`
- `snap_to_guides`

## 2. invariants（核心）

- 对象 ID 必须全局唯一。
- imported object 必须有非空 `provenance.originSourceId`。
- `raw_text` 必须具备 `text_edit`。
- proxy text 不得具备 `text_edit`。
- `panel` 必须有 `contentRootId`。
- 手动 promote/override 必须写入 `manualEdits` 与 `history.operationLog`。

## 3. 当前实现证据

- 约束逻辑：`packages/core-constraints/src/anchors|align|bounds|snapping|relayout`
- schema 校验：`packages/ir-schema/src/validators/schemaValidator.ts`
- invariant 校验：`packages/ir-schema/src/validators/invariantValidator.ts`
- capability 冲突校验：`packages/ir-schema/src/validators/capabilityValidator.ts`

## 4. 当前 gap

- 约束能力可执行，但缺少跨 family 的系统化稳定性与误差统计。
