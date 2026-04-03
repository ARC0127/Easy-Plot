# Verification APIs

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 12.5), `packages/testing-metrics/src/*`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review + smoke rerun

## 1. 可用入口

| API | 入口路径 | 当前状态 | 备注 |
| --- | --- | --- | --- |
| `computeVisualEquivalence` | `packages/testing-metrics/src/visual/computeVisualEquivalence.ts` | yes | 合并 semantic bbox + raster diff |
| `computeInteractionRetention` | `packages/testing-metrics/src/interaction/retention.ts` | yes | 高价值能力保留率计算 |
| `computeAcceptanceMetrics` | `packages/testing-metrics/src/acceptance/computeAcceptanceMetrics.ts` | yes | 族内指标聚合 |
| `familyPass` | `packages/testing-metrics/src/acceptance/familyGate.ts` | yes | 家族级 pass 判定 |
| `globalPass` | `packages/testing-metrics/src/acceptance/globalGate.ts` | yes | 全局 gate 判定 |

## 2. 语义说明

- 这些 API 已有实现入口，但当前结果仍属于“实现阶段验证”，不自动等同“正式产品通过”。
- 视觉比较逻辑支持渲染比较与近似 diff 回退模式，回退模式不能单独作为最终验收依据。
