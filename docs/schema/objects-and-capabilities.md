# 对象模型与能力标注

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 6.6-6.8), `packages/ir-schema/src/objects/*`, `packages/core-capability/src/assignCapabilities.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 能力枚举（冻结）

- `select`
- `multi_select`
- `drag`
- `resize`
- `delete`
- `text_edit`
- `style_edit`
- `group_only`
- `crop_only`
- `replace_image`
- `promote_semantic_role`
- `reparent`

## 2. 语义对象

- `panel`
- `legend`
- `annotation_block`
- `figure_title`
- `panel_label`

## 3. 渲染对象

- `text_node`
- `image_node`
- `shape_node`
- `group_node`
- `html_block`

## 4. 关键约束

- `raw_text` 必须允许 `text_edit`。
- `path_text_proxy` 与 `raster_text_proxy` 不得伪装成 `text_edit`。
- `capability` 必须显式赋值，不依赖 objectType 隐式推导。

## 5. 当前实现证据

- 对象定义：`packages/ir-schema/src/objects/*`
- 能力赋值：`packages/core-capability/src/assignCapabilities.ts`
- 能力冲突校验：`packages/ir-schema/src/validators/capabilityValidator.ts`

## 6. 当前 gap

- 能力正确性目前主要由 smoke 与规则校验覆盖，尚未形成 family-wise 能力准确率报告。
