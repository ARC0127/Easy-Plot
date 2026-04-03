# 桌面端与运行时边界

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Sections 9, 13, 16), repository layout, `scripts/build_store_distribution.cjs`
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun + e2e rerun

## 1. 规范目标

第一代优先桌面应用，支持：

- 本地文件系统访问
- 离线使用
- 导入报告与编辑闭环
- 推荐技术栈 `Tauri + React + TypeScript`

## 2. 当前状态

- 仓库已包含 `apps/desktop` 结构，具备 `main/preload/renderer`、四区布局与工作台操作链路。
- 已落地 `DesktopAppShell`：窗口生命周期、bridge 命令通道、GUI 壳文档渲染、release bundle 产物（`index.html + shell-manifest.json`）。
- `smoke:desktop` 已覆盖导入、命中选择、移动、文本编辑、多选提升、项目保存/加载路径。
- `smoke:desktop-shell` 与 `tests/e2e/desktop_shell_lifecycle.test.cjs` 已覆盖生命周期与发布壳产物。

## 3. 运行时边界结论

- 当前可证明“desktop 四区联动 + 生命周期 + 发布壳产物”闭环可执行。
- 当前已具备 Linux 安装包归档与 store-grade 分发 staging 自动化（distribution manifest + upload queue）。
- 当前已具备凭据发布 CI 通道（workflow_dispatch + secrets 驱动 `publish:store:ci`）。

## 4. 后续执行约束

- 后续重点是外部凭据发布 CI 化与更多 UI 可用性回归。
