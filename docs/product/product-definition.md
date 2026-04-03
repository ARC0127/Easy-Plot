# 产品定义与目标边界

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 1, 2)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 产品一句话

面向科研图和论文图的 Figure-native 编辑器：导入多来源 SVG/静态 HTML 后，尽可能提升高层对象并在 Figure IR 上持续编辑，再导出 clean SVG/HTML。

## 2. 核心目标

- G1 导入能力：支持多来源输入并生成对象树、能力标签、来源映射。
- G2 高层编辑：围绕 `panel`、`legend`、`text`、`annotation`、`image block` 做直接编辑。
- G3 持续闭环：`project.figure.json` 为长期真源，摆脱外部导出结构耦合。
- G4 可验收：schema、模块、API、指标和阈值可客观判定。

## 3. 非目标

- 不做通用网页搭建器，不做 Figma/Illustrator 全功能替代。
- 不承诺动态 HTML 全量回写，不承诺 token 级原位 patch。
- 不承诺从 raster 或 text-as-path 自动恢复完整语义编辑。

## 4. 需求分层

- L1 输入处理：解析、分类、导入。
- L2 内部建模：统一 Figure IR。
- L3 编辑：选择、拖拽、删除、改字、提升角色、分组。
- L4 导出持久化：project 保存、SVG/HTML 导出、round-trip/reimport。
- L5 验收核查：family-wise 指标与全局 gate。
