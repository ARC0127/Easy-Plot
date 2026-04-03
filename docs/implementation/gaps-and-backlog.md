# Gap 与执行 Backlog

- Status: gap
- Primary Source: frozen spec sections 7-18, repository state matrix, smoke evidence
- Last Verified: 2026-04-03
- Verification Mode: doc-only review + smoke rerun

## 1. 工作流拆分

### A. Import 线

- 提升 HTML/SVG parser 能力，当前已支持 namespace/localTag、CDATA、未加引号属性、numeric entity 文本解码，但仍需向完整规范语义推进。
- 提升 normalizer CSS 能力，当前已新增 `var()` 自定义属性级联与 fallback、`:lang`、`:is/:where`、`:not` 多项、`:nth-last-child`、`*-of-type` 支持；仍需继续补齐完整 CSS4/滤镜链语义。
- 强化 family classifier 证据与置信度输出。
- 提升 adapter/lift 精度并形成 family 误差分析。

### B. Editor 线

- 收敛 Project API 与 session API 边界。
- 补齐高频编辑场景的稳定回归测试。
- 增强手动 promote/override 规则与 UI 可解释性。

### C. Export 线

- 提升 SVG/HTML 导出 fidelity。
- 建立 reimport 后对象映射稳定性测试。
- 已切换到稳定渲染模式（`resvg`），当前 smoke 样例 `normalizedPixelDiff=0`（EQ-L2 阈值已通过）。

### D. Acceptance 线

- 固化 fixture 扩容后的质量门禁（已达最小规模，需持续质检）。
- D8 已完成：family/provenance/ground truth/package-data 四账可对齐且真实性比例达阈值。
- 完善 ground truth 与真实对象映射规则，降低“计数近似”误差。
- 保持 family-wise 自动化报告稳定通过，并补强真实多样样本覆盖。

### E. Desktop 线

- 已具备四区联动工作台、GUI shell 生命周期与 release bundle 产物链路。
- 已补齐 Section 16 发布资产：release notes、version manifest、Linux 安装包归档。
- 已补齐 store-grade 分发 staging 自动化：distribution manifest、upload queue、三通道 payload。
- 已补齐 store 凭据发布 CI 基线：`publish:store:ci` + `.github/workflows/store_publish.yml`（secrets 驱动）。
- 保持 `smoke:desktop` + `smoke:desktop-shell` + e2e 回归稳定。
- 后续推进签名审批流/多商店策略与 UI 可用性增强。

### F. Tests 线

- 扩展已建立的 `tests/unit|integration|e2e|visual_regression` 覆盖范围。
- 将 smoke + tests + acceptance 报告纳入统一 CI 门禁。
- 性能基线与复杂真实样例稳定性报告均已接入脚本化生成，后续扩展到更大真实样本规模。

## 2. 关键阻塞

- D3（parser/normalizer 深度合同）已完成收口并转绿；后续 parser/normalizer 项归类为增强项，不再作为首阻塞。
- D4（dynamic HTML `snapshot` 独立闭环）已完成收口并转绿。
- D7（desktop 正式 GUI 发布壳）已完成收口并转绿。
- D8：已完成并转绿（`nonSyntheticRatio=0.36538461538461536 >= 0.35`），后续仅做回归维持。
