# 仓库结构与模块设计

- Status: gap
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 11), repository `packages/*`
- Last Verified: 2026-04-03
- Verification Mode: doc-only review

## 1. 目标结构（规范）

规范要求 monorepo 包含：

- `apps/desktop`
- `packages/*`（schema、parser、normalizer、lifter、capability、constraints、history、export、editor、testing）
- `fixtures/*`
- `tests/unit|integration|e2e|visual_regression`
- `docs/schema|api|acceptance|audit`

## 2. 当前结构（实现）

当前存在：

- `packages/` 共 17 个模块
- `apps/desktop/`（main/preload/renderer + tauri config + `DesktopAppShell` GUI 壳）
- `tests/unit|integration|e2e|visual_regression` 基础测试树
- `.github/workflows/store_publish.yml`（store 发布 CI）
- `scripts/` smoke、验收与渲染比较脚本
- `fixtures/` 核心文件
- `docs/audit/` 及本轮重建后的完整 `docs/`

当前缺失：

- 更大规模高质量真实样例测试集（当前已覆盖 `real + weak_real` 子集并建立稳定性报告）

## 3. 包职责映射（实现证据）

- `ir-schema`: 类型、schema、validators
- `core-parser`: SVG/HTML 解析
- `core-normalizer`: style/transform/bbox 归一化
- `importer-adapters`: family 分类与 hints
- `core-lifter`: semantic lift + project 构建
- `core-capability`: capability 赋值
- `core-constraints`: anchor/align/distribute/snapping/relayout
- `core-history`: undo/redo/operation log/manual edits
- `core-export-svg` / `core-export-html`: 导出与导出报告
- `editor-state` / `editor-canvas` / `editor-tree` / `editor-properties` / `editor-import-report`
- `testing-fixtures` / `testing-metrics`

## 4. 关键 gap

- 跨包大量依赖 `dist` 导入路径，源码级依赖边界尚未收敛。
- D8 真实性门禁已通过（`nonSyntheticRatio=0.36538461538461536`），但高质量真实样例覆盖仍需持续扩展。
- 复杂真实样例稳定性回归已脚本化（`docs/audit/real_sample_stability_report.json`），后续继续扩展规模。
