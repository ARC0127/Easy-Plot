# 能力覆盖矩阵

- Status: gap
- Primary Source: `packages/*/src`, smoke scripts, frozen spec sections 7-10
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. 能力维度覆盖

| 能力域 | 目标合同 | 当前证据 | 覆盖状态 |
| --- | --- | --- | --- |
| 输入解析 | SVG + 静态 HTML | `core-parser` + `smoke:import-pipeline` | partial |
| 归一化 | style/transform/bbox | `core-normalizer` | partial |
| family 分类 | 六个正式 family | `importer-adapters/classifyFamily` | partial |
| semantic lifting | panel/legend/text/annotation/image block | `core-lifter` | partial |
| capability assign | 显式能力标注 | `core-capability` + validator | partial |
| 编辑核心 | select/move/delete/edit/promote/group | `editor-state` + `core-history` | partial |
| 约束系统 | anchor/align/distribute/snap | `core-constraints` | partial |
| 导出 | SVG + HTML | `core-export-svg`, `core-export-html` | partial |
| roundtrip/reimport | no-op + reimport retention | `testing-metrics/roundtrip` | partial |
| acceptance | family-wise + global gate | `testing-metrics/acceptance` | partial |
| 复杂真实样例稳定性 | real/weak_real 子集回归 | `scripts/real_sample_stability_report.cjs` + `smoke:real-sample-stability` | implemented |
| 桌面应用 | 四区 UI + 生命周期 + 发布壳产物 | `apps/desktop` + `smoke:desktop` + `smoke:desktop-shell` + `tests/e2e/desktop_shell_lifecycle.test.cjs` | implemented |
| store 分发自动化 | 多通道分发清单 + upload queue | `scripts/build_store_distribution.cjs` + `smoke:store-distribution` | implemented |
| store 凭据发布 CI | secrets 驱动发布脚本与工作流 | `scripts/publish_store_distribution.cjs` + `smoke:store-publish-ci` + `.github/workflows/store_publish.yml` | implemented |
| 正式 tests harness | unit/integration/e2e/visual | `tests/*` + `npm run test:all` | partial |

## 2. honest labeling 覆盖

- 已有基础实现：
- `ERR_TEXT_EDIT_UNSUPPORTED`
- capability conflict/invariant 校验
- import report view model
- import capability 交付文档：`docs/implementation/import-capability-report.md`
- 待补：
- 面向最终用户的统一限制提示策略
- dynamic HTML 与 degraded 模式的统一 UX 合同
