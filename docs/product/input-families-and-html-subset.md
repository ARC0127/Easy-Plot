# 输入族与 HTML 子集合同

- Status: normative
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 3, 3.3)
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 正式支持输入族

- `matplotlib`
- `chart_family`
- `illustration_like`
- `llm_svg`
- `static_html_inline_svg`
- `degraded_svg`

实现可返回 `unknown`，但不作为第一代正式支持族。

## 2. 输入结构层级能力边界

- L0 Pure semantic SVG：强 semantic lifting，强 text edit。
- L1 Hybrid SVG：局部语义编辑 + raster 原子化处理。
- L2 Degraded SVG：group/block 级编辑 + manual promote + honest labeling。
- L3 Static HTML + inline SVG：HTML block 编辑 + 子 SVG 语义编辑。
- L4 Dynamic HTML：仅 `limited mode` 或 `snapshot import`，不得伪装 full editable。

## 3. HTML-native subset（第一版冻结）

### 支持标签

- `div`
- `span`
- `p`
- `img`
- `svg` (inline)
- `section`
- `figure`
- `figcaption`

### 支持布局

- `position: absolute`
- `position: relative`
- 简单 `flex`
- 简单单层 `grid`

### 支持样式来源

- inline style
- 同文件 `<style>` 的静态可解析规则
- 可追踪 class 规则

### 明确不支持

- runtime JS 改 DOM
- framework hydration
- shadow DOM
- 深度 CSS variable 依赖链
- 运行时测量回填布局

超出子集合同时，必须退化到 `limited mode` 或 `snapshot import mode`。
