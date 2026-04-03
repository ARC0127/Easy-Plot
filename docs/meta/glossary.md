# 术语表

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 1-6, 13-14)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 核心术语

- Figure IR: 内部长期真源模型，导入后编辑闭环围绕它展开。
- Source Mode: `native` 或 `imported`。
- Semantic Object: `panel`, `legend`, `annotation_block`, `figure_title`, `panel_label`。
- Render Object: `text_node`, `image_node`, `shape_node`, `group_node`, `html_block`。
- Provenance: 对象来源追踪信息，包含原始节点、路径、提升方式与置信度。
- Capability Flag: 对象可执行操作集合，例如 `drag`, `resize`, `text_edit`。
- Stability Profile: 对象在导出、重导入、交互保留上的稳定性描述。
- Manual Edit: 人工提升、角色覆盖、锚点调整等手动编辑记录。

## 2. 验收术语

- EQ-L0/L1/L2/L3: 语义、结构、视觉、交互等价等级。
- S1/S2/S3: no-op、single-edit、reimport 三类稳定性合同。
- Family-wise Threshold: 每个输入族独立验收阈值。
- Global Gate: 全局通过门槛，要求指定 family 必过并满足 honest labeling。

## 3. 输入族

- `matplotlib`
- `chart_family`
- `illustration_like`
- `llm_svg`
- `static_html_inline_svg`
- `degraded_svg`
- `unknown`（实现层可输出，规范层不作为正式支持族）
