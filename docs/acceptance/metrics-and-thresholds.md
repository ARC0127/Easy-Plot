# 指标定义与阈值

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 14.3-14.5), `fixtures/acceptance_thresholds.md`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 指标定义（M1-M7）

- M1 `panel_detection_recall`
- M2 `legend_detection_success_rate`
- M3 `true_text_editable_rate`
- M4 `raster_block_correct_label_rate`
- M5 `import_visual_equivalence_pass_rate`
- M6 `single_edit_roundtrip_pass_rate`
- M7 `reimport_interaction_retention_rate`

## 2. 视觉等价定义

- VE-A：semantic bbox/anchor 保持
- VE-B：固定渲染环境 raster diff 阈值
- no-op round-trip pass 必须同时满足 VE-A + VE-B

## 3. family-wise 阈值（冻结）

按冻结规范执行：

- `matplotlib`: 高阈值，要求最强检测与编辑保留
- `chart_family`: 中高阈值
- `illustration_like`: 中高阈值
- `llm_svg`: 中等阈值 + raster 标注约束
- `static_html_inline_svg`: 中等阈值
- `degraded_svg`: 允许较低 semantic 指标，但 honest labeling 指标必须高

详细数值以冻结 PDF 与 `fixtures/acceptance_thresholds.md` 对齐，后续变更需走文档变更策略。
