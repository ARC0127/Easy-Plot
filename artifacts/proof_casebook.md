[THEOREM_NORMALIZATION]
claim_id: SPEC_DIFF_AUDIT_2026_04_02
normalized_statement: 当前仓库是否已完整补齐《Figure Editor Complete Requirements Spec V1.pdf》冻结需求（Sections 0-20）
goal_kind: requirements_conformance_audit
domain_scope: 文档、代码、脚本、测试、验收产物对照
target_rigor: proof-engine audit (first-error-wins)
notation_ambiguities: “最初开发文档”按 PDF 冻结规范解释
success_criterion: 关键合同项均有实现证据且无关键缺口

| assumption_id | assumption | source | type | necessity | status | used_by |
|---|---|---|---|---|---|---|
| A1 | PDF 0-20 章是规范真源 | explicit | scope | required | supported | L1-L9 |
| A2 | 当前仓库状态以 `figure-editor-draft` 为准 | explicit | scope | required | supported | L1-L9 |
| A3 | “补全”要求包含实现与验收闭环，不仅文档存在 | inferred | criterion | required | supported | L2-L9 |
| A4 | `DEBUG_VIBE_CORE:ON / VIBE:M3 / HCP:ON` 为本轮执行约束 | explicit | process | required | supported | D2-D10 |

| lemma_id | node_kind | short_statement | depends_on | supports | source | status |
|---|---|---|---|---|---|---|
| L1 | claim | 文档体系与 1-20 章映射已建立 | A1,A2 | D1 | `docs/index.md`, reconstruction audit | available |
| L2 | claim | compile/build/smoke/test/acceptance 闭环可执行 | A2,A4 | D2 | current verification report | available |
| L3 | claim | dynamic HTML mode + Project API + reimport API 已落地 | A1,A2 | D4-D6 | parser/editor-state/testing-metrics | available |
| L4 | claim | 视觉比较已进入渲染主路径（resvg）且当前 smoke 阈值通过 | A2 | D10 | roundtrip smoke evidence | available |
| L5 | claim | parser/normalizer 的 D3 深度合同已达成 | A1,A2,A3 | D3 | parser/normalizer code evidence | available |
| L6 | claim | desktop 正式 GUI 发布壳已落地并可验证 | A1,A2,A3 | D7 | apps/desktop + release docs | available |
| L7 | claim | fixture/GT 结构闭环与真实性比例阈值均已达标 | A1,A2,A3 | D8 | fixtures + acceptance docs + authenticity report | available |
| L8 | claim | 长尾 CSS 语义扩展与 store 凭据发布 CI 基线已落地 | A1,A2,A3,A4 | D13 | normalizer + publish workflow evidence | available |

| segment_id | source_span | claimed_transform | required_rule | local_check | verdict | notes |
|---|---|---|---|---|---|---|
| D1 | PDF Sec 11 / docs index | 结构映射是否齐全 | 章节映射一致性 | 覆盖存在 | pass | 目录层已覆盖 |
| D2 | PDF Sec 14 / verification report | 验证闭环是否可执行 | MR/CL + regression | `typecheck/build/smoke/test/acceptance` 全部可跑 | pass | 命令链路闭环成立 |
| D3 | PDF Sec 7.2/7.3 | parser/normalizer 是否达规范深度 | namespace/style block/clipPath/mask 等深度合同 | 已落地 namespace/localTag、style 规则、`> + ~` 组合符、attr operators、pseudo classes、`!important` 级联、inline style 复杂值解析、clip/mask/use、transform 继承、numeric entity 解码、HTML 容错解析 | pass | D3 合同本轮已完成 |
| D4 | PDF Sec 3.2 L4 + 3.3 | dynamic HTML mode 合同 | strict/limited/snapshot + typed error | strict/limited/snapshot 已形成闭环：session 只读策略、save/load 继承、export-reimport 再导入、smoke+e2e 证据均已落地 | pass | D4 已转绿 |
| D5 | PDF Sec 10.1/12.2 | Project 持久化 API 是否齐全 | create/load/save/archive/validate | 入口已实现并集成测试 | pass | 合同主干已落地 |
| D6 | PDF Sec 10.5/12.4 | reimport API 合同是否齐全 | `reimportExportedArtifact` | public API 已实现并 e2e 覆盖 | pass | roundtrip 合同补齐 |
| D7 | PDF Sec 9 | 桌面四区是否“正式应用” | 窗口壳 + 生命周期 + 打包分发 | 已落地 `DesktopAppShell`（生命周期 + bridge + GUI 壳文档 + release bundle），并通过 smoke/e2e | pass | D7 已转绿 |
| D8 | PDF Sec 14.2/14.3 | fixture/GT 质量是否达规范语义 | 真实多样样本与标注 | `structuralPass=true` 且 `nonSyntheticRatio=0.36538461538461536 >= 0.35` | pass | D8 已完成收口 |
| D9 | PDF Sec 16/19/20 | 文档与审计是否一致 | current state 与 audit 同步 | 主要漂移已修正 | pass | 需持续保持 |
| D10 | PDF Sec 4/10/14 | 视觉等价路径与阈值 | 渲染比较 + EQ-L2 阈值 | `rendered_svg_resvg` 且 `normalizedPixelDiff=0` | pass | 当前 smoke 阈值已达标 |
| D11 | PDF Sec 16 | 完整发布资产是否齐备 | release notes / version manifest / 可安装包 | 已落地 release notes/version manifest/versioned schema/Linux 安装包归档/distribution manifests | pass | Sec16 交付资产闭环 |
| D12 | PDF Sec 13.5 | MVP 性能要求是否有证据 | 导入耗时/交互流畅性基线 | 已落地性能基线脚本与报告（import/editor/roundtrip）+ real/weak_real 稳定性报告 | pass | 证据链可复现 |
| D13 | PDF Sec 7/16/18 | 增强项是否落地可执行 | 长尾 CSS 扩展 + 凭据发布 CI | 已落地 `var()`/advanced pseudo 长尾语义与 `publish:store:ci` + workflow + smoke 报告 | pass | 增强项闭环完成 |

| review_id | angle | inspected_scope | local_verdict | fatality | error_anchor | error_explanation |
|---|---|---|---|---|---|---|
| R1 | contract-match | Sec 7 parser/normalizer | true | nonfatal | D3 | D3 深度合同在当前范围内已达成 |
| R2 | mode-boundary | Sec 3 HTML contract | true | nonfatal | D4 | strict/limited/snapshot 三模式合同已闭环，snapshot 只读边界已通过 save/load 与 export-reimport 复验 |
| R3 | api-completeness | Sec 10/12 API | true | nonfatal | D5,D6 | Project persistence + reimport 合同主干已落地 |
| R4 | productization | Sec 9 desktop app | true | nonfatal | D7 | DesktopAppShell 与 release bundle 已形成可验证 GUI 壳闭环 |
| R5 | evidence-quality | Sec 14 fixtures/GT | true | nonfatal | D8 | 结构一致性与真实性比例阈值均已通过 |
| R6 | visual-equivalence | Sec 4/10/14 EQ-L2 | true | nonfatal | D10 | 渲染路径与阈值在当前 smoke 样例已转绿 |
| R7 | release-assets | Sec 16 deliverables | true | nonfatal | D11 | release notes/version manifest/versioned schema/installer 资产齐备 |
| R8 | performance-evidence | Sec 13.5 baseline + real samples | true | nonfatal | D12 | 导入/编辑/roundtrip 基线与 real/weak_real 稳定性报告已闭环 |
| R9 | enhancement-closure | long-tail css + credentialed ci | true | nonfatal | D13 | 长尾 CSS 语义扩展与 store 凭据发布 CI 基线已闭环 |

[VERIFICATION_RECORD]
proof_verdict: verified_true
first_failing_step: none
first_failing_reason: none
annotation_or_rigor_mismatch: 有（family-wise 报告通过不等于规范完整达标）
majority_diagnostic: 0/9 评审角度存在关键缺口（D1-D13 已转绿）
reverify_required: false
formal_adapter_status: N/A
remaining_unknowns: 更大规模真实样本分布下的长期漂移数据仍需持续积累（不构成当前闭环阻塞）

[REPAIR_PROPOSAL]
repair_target: 保持 Sections 0-20 闭环转绿并持续回归
minimal_change_set:
1) 维持发布资产自动生成与 smoke 校验，防止回退
2) 维持复杂真实样例稳定性报告回归（real/weak_real 子集）
3) 维持长尾 CSS 语义回归单测与 store 凭据发布 CI smoke
corrected_steps: 持续稳定 1-3
why_this_addresses_the_fatal_flaw: 当前无 fatal flaw，后续是稳定性与工程化增强
reverify_next: 按 Sec 13/16/18 持续回归

[ITERATION_LOG]
| iter | organize_scope | commands | local_verdict | first_error | notes |
|---|---|---|---|---|---|
| R1_2026_04_02 | 渲染比较链路整理、snapshot 会话策略、审计文档同步 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | `overallPass=true`，但 `visualPass=false` 且 `normalizedPixelDiff=0.2333` |
| R2_2026_04_02 | D3 深度整理：namespace/localTag、style block、clip/mask/use、transform 继承矩阵 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | 新增 parser/normalizer 深度单测通过，D3 缺口从“骨架级”收敛为“完整性不足” |
| R3_2026_04_02 | Desktop 初步可用推进：pilot CLI + 文件工作流 smoke | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | desktop 已有初步可用入口，整体 first-error 仍是 D3 |
| R4_2026_04_02 | 初步可用完成态复核（文档同步后重跑闭环） | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | 证据链稳定，完整目标仍由 D3/D7/D10 主导 |
| R5_2026_04_02 | D10 定向修复：text 坐标回退 + shape 导出样式默认值修正 + 导出属性回退策略 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | roundtrip `visualPass=true` 且 `normalizedPixelDiff=0`，D10 转绿 |
| R6_2026_04_02 | D3 深度继续补齐：CSS 组合符（`> + ~`）+ inline style 复杂值解析 + numeric entity 解码 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D3 | 新增 D3 单测通过，深度合同进一步收敛 |
| R7_2026_04_02 | D3 完成收口：content sniffing + HTML 容错解析 + attr operators + pseudo classes + `!important` 级联 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D4 | D3 已完成，first-error 已切换到 D4 |
| R8_2026_04_02 | D4 收口：snapshot 会话只读边界 + save/load 继承 + export-reimport 闭环 + snapshot smoke | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D7 | D4 已转绿，first-error 前移到 D7 |
| R9_2026_04_02 | D7 收口：DesktopAppShell 生命周期 + bridge + GUI 壳文档 + release bundle + desktop shell smoke/e2e | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D8 | D7 已转绿，first-error 前移到 D8 |
| R10_2026_04_02 | D8 结构闭环：provenance matrix + GT `provenanceRef` + authenticity smoke/integration + 文档同步 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass-with-gap | D8 | D8 结构一致性转绿，真实性比例阈值仍未达标 |
| R11_2026_04_02 | D8 收口：真实性配比达标（19/52）+ 审计回归 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass | none | D8 已转绿，D1-D10 无阻塞 |
| R12_2026_04_02 | 深核 Sections 13-20：PDF 原文 vs 发布资产/性能证据 | `PDF 抽取 + 仓库资产核查 + 全链路闭环` | pass-with-gap | D11 | first-error 切换到 Sec16 发布资产不完整 |
| R13_2026_04_02 | 收口 Sections 13/16：发布资产自动生成 + 性能基线报告 + import capability 资产 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass | none | proof 回到全绿 |
| R14_2026_04_02 | 收口剩余增强主线：real-sample stability + store distribution automation | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass | none | 仓库内可执行缺口清零，proof 维持全绿 |
| R15_2026_04_03 | 收口增强项：长尾 CSS 语义扩展 + store 凭据发布 CI 基线 | `typecheck:all && build:all && smoke:all && test:all && acceptance:family` | pass | none | 增强项落地并通过闭环重验 |
