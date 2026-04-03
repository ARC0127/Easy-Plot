# Proof 验证循环台账

- Status: audit
- Primary Source: `artifacts/proof_casebook.md`, `artifacts/evidence_ledger.csv`, `npm run typecheck:all`, `npm run build:all`, `npm run smoke:all`, `npm run test:all`, `npm run acceptance:family`, `npm run smoke:fixture-authenticity`, `npm run smoke:release-assets`, `npm run smoke:store-distribution`, `npm run smoke:store-publish-ci`, `npm run smoke:performance-baseline`, `npm run smoke:real-sample-stability`
- Last Verified: 2026-04-03
- Verification Mode: proof-engine style rerun

## 1. 循环规则（强制）

- 每完成一轮“整理/补齐”，必须执行一次 proof 验证，不允许只改文档不验。
- proof 验证最小命令集：
- `npm run typecheck:all`
- `npm run build:all`
- `npm run smoke:all`
- `npm run test:all`
- `npm run acceptance:family`
- 每轮验证后必须同步：
- `artifacts/proof_casebook.md`
- `artifacts/evidence_ledger.csv`
- `artifacts/negative_result_ledger.md`（若出现 rejected/partial）

## 2. 迭代记录（ITERATION_LOG）

| Iteration | 整理范围 | Proof 命令 | 结果 | 首个失败点 | 结论 |
| --- | --- | --- | --- | --- | --- |
| R1 (2026-04-02) | 视觉比较路径整理（resvg）、snapshot 会话策略、审计文档同步 | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 深度合同) | `overallPass=true`，但 `roundtrip visualPass=false`（`normalizedPixelDiff=0.2333`） |
| R2 (2026-04-02) | D3 深度整理（namespace/localTag、style block 选择器、clipPath/mask/use、transform 继承矩阵） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 完整合同) | 深度能力显著提升并新增单测；仍未达到“完整规范实现” |
| R3 (2026-04-02) | 初步可用推进（desktop pilot CLI + 文件工作流闭环 + smoke 接入） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 完整合同) | 已具备初步可用入口，仍有规范完整性缺口 |
| R4 (2026-04-02) | 初步可用完成态复核（含文档同步后再验证） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 完整合同) | 整理后证据闭环稳定，初步可用已达成，完整目标仍未达成 |
| R5 (2026-04-02) | D10 导出保真度定向修复（text 坐标回退、shape 样式默认值、导出属性回退策略） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 完整合同) | `roundtrip visualPass=true`，`normalizedPixelDiff=0`，D10 已转绿 |
| R6 (2026-04-02) | D3 深度继续补齐（CSS 选择器 `> + ~`、inline style 复杂值解析、numeric entity 解码） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D3 (Sec 7 parser/normalizer 完整合同) | 新增 D3 单测并通过，Import 语义覆盖进一步提升 |
| R7 (2026-04-02) | D3 完成收口（content sniffing、HTML void/implicit-close 容错、attr operators、pseudo classes、`!important` 级联） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D4 (Sec 3 snapshot 独立闭环) | D3 已转绿，first-error 已切换到 D4 |
| R8 (2026-04-02) | D4 收口（snapshot 会话只读边界、save/load 继承、export-reimport 闭环、snapshot smoke） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D7 (Sec 9 desktop 正式发布壳) | D4 已转绿，first-error 前移到 D7 |
| R9 (2026-04-02) | D7 收口（DesktopAppShell 生命周期 + bridge + GUI 壳文档 + release bundle + desktop shell smoke/e2e） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D8 (Sec 14 fixture/GT 真实性证据) | D7 已转绿，first-error 前移到 D8 |
| R10 (2026-04-02) | D8 结构闭环整理（provenance matrix + GT 字段补齐 + authenticity smoke/integration） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass-with-gap | D8 (Sec 14 真实性比例阈值) | D8 结构一致性已转绿，真实性比例阈值仍未达标 |
| R11 (2026-04-02) | D8 收口（真实性配比达标 + provenance 回归 + 审计口径同步） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass | none | D8 已转绿，当前无 D1-D10 阻塞 |
| R12 (2026-04-02) | zyr proof 深核（直接对照 PDF Section 13-20 与仓库资产） | `pdf 原文抽取 + docs/assets 对照 + 全链路闭环` | pass-with-gap | Sec 16 发布资产 | D1-D10 转绿，但 Sections 13/16/18 仍有交付级缺口 |
| R13 (2026-04-02) | Sec13/Sec16 收口（release assets + performance baseline + import capability 交付资产） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass | none | 发布资产与性能基线已补齐，proof 回到全绿 |
| R14 (2026-04-02) | 收口剩余增强主线（real-sample stability + store distribution automation） | `typecheck:all + build:all + smoke:all + test:all + acceptance:family` | pass | none | 仓库内可执行缺口清零，proof 维持全绿 |
| R15 (2026-04-03) | 增强项收口（长尾 CSS 语义扩展 + 凭据发布 CI 基线） | `build:all + test:unit + smoke:store-publish-ci + 全链路闭环` | pass | none | 增强项落地且闭环通过 |

## 3. 当前 Proof Verdict

- `proof_verdict: verified_true`
- `first_failing_step: none`
- `first_failing_reason: none`
- `nonfatal_gaps: 无（仓库内可执行范围）`

## 4. 下轮动作约束

- 下一轮整理默认优先更深层 SVG/CSS 语义与签名审批流编排。
- D3 已转绿，后续 parser/normalizer 扩展项按“增强项”管理，不再作为首阻塞。
- D4 已转绿，snapshot 独立闭环改为“已完成能力”，后续仅做回归维持。
- D7 已转绿，desktop GUI 壳改为“已完成能力”，后续聚焦外部凭据发布 CI 化与可用性增强。
