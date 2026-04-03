# Acceptance Thresholds

## matplotlib
- panel_detection_recall >= 0.90
- legend_detection_success_rate >= 0.85
- true_text_editable_rate >= 0.95
- import_visual_equivalence_pass_rate >= 0.90
- single_edit_roundtrip_pass_rate >= 0.85
- reimport_interaction_retention_rate >= 0.90

## chart_family
- panel_detection_recall >= 0.80
- legend_detection_success_rate >= 0.80
- true_text_editable_rate >= 0.90
- import_visual_equivalence_pass_rate >= 0.85
- single_edit_roundtrip_pass_rate >= 0.80
- reimport_interaction_retention_rate >= 0.85

## illustration_like
- panel_detection_recall >= 0.75
- legend_detection_success_rate >= 0.75
- true_text_editable_rate >= 0.90
- import_visual_equivalence_pass_rate >= 0.90
- single_edit_roundtrip_pass_rate >= 0.85
- reimport_interaction_retention_rate >= 0.85

## llm_svg
- panel_detection_recall >= 0.65
- legend_detection_success_rate >= 0.70
- true_text_editable_rate >= 0.75
- import_visual_equivalence_pass_rate >= 0.80
- single_edit_roundtrip_pass_rate >= 0.75
- reimport_interaction_retention_rate >= 0.75
- raster_block_correct_label_rate >= 0.95

## static_html_inline_svg
- panel_detection_recall >= 0.70
- legend_detection_success_rate >= 0.75
- true_text_editable_rate >= 0.85
- import_visual_equivalence_pass_rate >= 0.85
- single_edit_roundtrip_pass_rate >= 0.80
- reimport_interaction_retention_rate >= 0.80

## degraded_svg
- panel_detection_recall >= 0.50
- legend_detection_success_rate >= 0.55
- editable_or_honestly_labeled_rate >= 0.95
- import_visual_equivalence_pass_rate >= 0.85
- single_edit_roundtrip_pass_rate >= 0.70
- reimport_interaction_retention_rate >= 0.65
- raster_block_correct_label_rate >= 0.98
