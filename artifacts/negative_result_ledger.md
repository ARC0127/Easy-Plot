# Negative Result Ledger

## 2026-04-02: 规范一致性核对

- 分支：`假设当前实现已完整补齐 PDF Sections 0-20`
- 结果：`rejected`
- 首个致命失败点：Section 7.2/7.3（parser/normalizer 深度合同）
- 失败证据：
  - `/mnt/f/Git/Figure-Editor/figure-editor-draft/packages/core-parser/src/xmlLike.ts`
  - `/mnt/f/Git/Figure-Editor/figure-editor-draft/packages/core-normalizer/src/normalizeDocument.ts`
  - `/mnt/f/Git/Figure-Editor/figure-editor-draft/packages/core-normalizer/src/style/collectInlineStyles.ts`

- 额外失败点：
  - Section 3.3 snapshot 闭环仍未完成（strict/limited 已落地）
  - Section 9 desktop 仍非正式应用壳
  - Section 4/14 视觉阈值仍未达标（虽然已切换到 rendered 比较）

## 2026-04-02: 二次重验（API 与渲染路径补齐后）

- 分支：`假设已消除关键 API 缺口并建立稳定视觉比较主路径`
- 结果：`partially accepted / still rejected for full conformance`
- 已确认补齐：
  - `Project` persistence APIs 已落地并有 integration test
  - `reimportExportedArtifact` public API 已落地并有 e2e test
  - 视觉比较主路径已从 `approx_markup_diff` 升级到 `rendered_svg_resvg`
- 仍未通过的关键点：
  - Section 7 parser/normalizer 规范深度仍不足
  - Section 9 desktop 仍缺正式窗口壳与发布链路
  - Section 14 视觉阈值未达标（`normalizedPixelDiff=0.2333`）

## 2026-04-02: 三次重验（D3 深度增量后）

- 分支：`假设 D3 已通过（parser/normalizer 深度合同完全补齐）`
- 结果：`rejected`
- 已确认进展：
  - namespace/localTag、CDATA、未加引号属性解析已接入
  - style block 规则、clipPath/mask/use、transform 继承矩阵已接入
  - 新增 D3 深度单测并通过
- 仍被拒绝原因：
  - Section 7 仍缺“完整规范级”解析/归一化覆盖（当前是增强版但非完整实现）
  - Section 9 desktop 发布壳未完成
  - Section 14 视觉阈值未达标（`normalizedPixelDiff=0.2333`）

## 2026-04-02: 四次重验（desktop 初步可用推进后）

- 分支：`假设已达到可初步使用并接近完整设计目标`
- 结果：`partially accepted / still rejected for full conformance`
- 已确认新增：
  - 新增 `desktop:pilot` CLI，可执行打开/编辑/保存项目/导出链路
  - `smoke:desktop-pilot` 已接入并通过
- 仍被拒绝原因：
  - Section 7 first-error 仍在（完整规范级 parser/normalizer 合同未全绿）
  - Section 9 仍缺正式 GUI 发布壳（当前是 pilot CLI + workbench）
  - Section 14 视觉阈值未达标（`normalizedPixelDiff=0.2333`）

## 2026-04-02: 五次重验（D10 导出保真度定向修复后）

- 分支：`假设 D10 导出保真度与视觉阈值主阻塞可被清除`
- 结果：`partially accepted / still rejected for full conformance`
- 已确认新增：
  - roundtrip 视觉比较转绿（`visualPass=true`，`normalizedPixelDiff=0`）
  - 关键修复已落地：text 坐标回退、shape 默认样式策略、导出属性回退策略
  - 闭环命令再次通过：`typecheck/build/smoke/test/acceptance`
- 仍被拒绝原因：
  - Section 7 first-error 仍在（完整规范级 parser/normalizer 合同未全绿）
  - Section 9 仍缺正式 GUI 发布壳（当前是 pilot CLI + workbench）

## 2026-04-02: 六次重验（D3 深度继续补齐后）

- 分支：`假设 D3 可通过持续增量在当前轮次完全转绿`
- 结果：`partially accepted / still rejected for full conformance`
- 已确认新增：
  - parser 新增 numeric entity 文本解码（含十进制与十六进制）
  - normalizer 新增 CSS 组合符支持（`> + ~`）与 inline style 复杂值解析
  - 新增 D3 单测并通过，且全链路闭环复验通过
- 仍被拒绝原因：
  - Section 7 first-error 仍在（距离“完整规范级 parser/normalizer”仍有覆盖缺口）
  - Section 9 仍缺正式 GUI 发布壳（当前是 pilot CLI + workbench）

## 2026-04-02: 七次重验（D3 完成收口后）

- 分支：`假设 D3 可在本轮完整结束`
- 结果：`accepted for D3 / still rejected for full-conformance`
- 已确认新增：
  - D3 深度合同转绿（parser/normalizer）
  - 新增并通过 D3 收口测试（content sniffing、HTML 容错、attr operators、pseudo classes、`!important` 级联）
  - 全链路闭环再次通过：`typecheck/build/smoke/test/acceptance`
- 仍被拒绝原因：
  - Section 3.3：snapshot 独立闭环未完成（新 first-error）
  - Section 9：desktop 正式 GUI 发布壳未完成

## 2026-04-02: 八次重验（D4 完成收口后）

- 分支：`假设 D4 snapshot 独立闭环可在本轮完整结束`
- 结果：`accepted for D4 / still rejected for full-conformance`
- 已确认新增：
  - snapshot 会话只读门禁已接入 `editor-state#runOperation`
  - snapshot 元数据标签（`session:snapshot_read_only` / `html_mode:snapshot`）已支持 save/load 继承
  - `import -> save/load -> export/reimport -> reimport(snapshot)` 闭环已由 e2e + smoke 覆盖并通过
- 仍被拒绝原因：
  - Section 9：desktop 正式 GUI 发布壳未完成（当前仍为 workbench + pilot CLI）
  - Section 14：fixture/ground truth 真实性与多样性证据仍需补强

## 2026-04-02: 九次重验（D7 完成收口后）

- 分支：`假设 D7 desktop 正式 GUI 发布壳可在本轮完成`
- 结果：`accepted for D7 / still rejected for full-conformance`
- 已确认新增：
  - `DesktopAppShell` 已提供窗口生命周期（launch/running/close）
  - preload bridge 已支持命令处理器注入与 invoke 通道
  - GUI 壳文档渲染与 release bundle（`index.html + shell-manifest.json`）已落地
  - `smoke:desktop-shell` 与 `tests/e2e/desktop_shell_lifecycle.test.cjs` 均通过
- 仍被拒绝原因：
  - Section 14：fixture/ground truth 真实性与多样性证据仍需补强

## 2026-04-02: 十次重验（D8 结构闭环整理后）

- 分支：`假设 D8 可在本轮直接转绿`
- 结果：`partially accepted / still rejected for full conformance`
- 已确认新增：
  - `fixtures/fixture_provenance_matrix.csv` 已建立并覆盖 52/52 fixture
  - `ground_truth_schema.json` 已要求 `provenanceRef` 且 root GT 已补齐 `fixtureId/family/provenanceRef`
  - `smoke:fixture-authenticity` 与 integration test 已接入，结构一致性结论为 `structuralPass=true`
- 仍被拒绝原因：
  - Section 14：真实性比例阈值未达标（`nonSyntheticRatio=0 < 0.35`）

## 2026-04-02: 十一次重验（D8 完成收口后）

- 分支：`假设 D8 可在下一轮完成`
- 结果：`accepted`
- 已确认新增：
  - provenance 配比已达标：`nonSyntheticCount=19/52`（`nonSyntheticRatio=0.36538461538461536`）
  - `smoke:fixture-authenticity` 结论转为 `overallPass=true`、`status=pass`
  - D8 integration test 已更新并通过
- 拒绝原因：无（D8 已转绿）

## 2026-04-02: 十二次重验（zyr proof 深核 Sections 13-20）

- 分支：`假设已与初始冻结规范（Sections 0-20）完全一致`
- 结果：`rejected`
- 首个致命失败点：Section 16（完整发布资产不齐）
- 失败证据：
  - 缺少 release notes 文件（仓库内未检出）
  - 缺少 version manifest 文件（仓库内未检出）
  - 缺少原生安装包产物（当前仅有 desktop release bundle：`index.html + shell-manifest.json`）
- 次级缺口：
  - Section 13.5 性能要求缺少可复现测量证据
  - import capability 报告未形成独立交付资产

## 2026-04-02: 十三次重验（Sections 13/16 收口后）

- 分支：`假设 Sections 13/16 缺口可在本轮补齐`
- 结果：`accepted`
- 已确认新增：
  - 发布资产闭环：`release_notes`、`version-manifest`、`versioned schema`、Linux 安装包归档已脚本化生成并 smoke 校验通过
  - 性能基线闭环：`performance_baseline_report` 已可复现生成并通过当前阈值
  - import capability 独立交付文档已补齐
- 拒绝原因：无（本轮 first-error 已消失）

## 2026-04-02: 十四次重验（复杂真实样例稳定性 + store 分发自动化收口）

- 分支：`假设仓库内剩余主缺口可在本轮全部清零`
- 结果：`accepted`
- 已确认新增：
  - `smoke:real-sample-stability` 已接入并通过（`real+weak_real` 子集 19 fixtures，`overallPass=true`）
  - `smoke:store-distribution` 已接入并通过（distribution manifest/upload queue/三通道 payload hash 校验）
  - integration tests 已新增并通过（stability + distribution）
- 拒绝原因：无（仓库内可执行缺口已清零）

## 2026-04-03: 十五次重验（增强项：长尾 CSS + 凭据发布 CI）

- 分支：`假设增强项可在本轮闭环落地`
- 结果：`accepted`
- 已确认新增：
  - 长尾 CSS 语义扩展已落地并通过 unit 回归（`var()`、`:lang`、`:is/:where`、`:not` 多项、`nth-last-child`、`*-of-type`）
  - `publish_store_distribution.cjs` 与 `smoke_store_publish_ci.cjs` 已落地并通过
  - `.github/workflows/store_publish.yml` 已提供凭据发布 CI 通道（secrets 驱动）
- 拒绝原因：无
