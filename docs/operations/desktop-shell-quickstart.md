# Desktop Shell 快速使用

- Status: implemented
- Primary Source: `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/renderer/shellDocument.ts`, `scripts/smoke_desktop_shell.cjs`, `scripts/build_desktop_release.cjs`
- Last Verified: 2026-04-03
- Verification Mode: smoke rerun + e2e rerun

## 1. Shell 能力

- 窗口生命周期：`launch -> running -> close`
- 四区 GUI 文档壳：`Object Tree` / `Canvas` / `Properties` / `Import Report`
- bridge 命令通道：preload 可注入命令处理器并调用 shell
- release bundle：生成 `index.html + shell-manifest.json`

## 2. 常用命令

- 生成发布壳 bundle：`npm run desktop:bundle`
- 启动可操作 GUI Runtime：`npm run desktop:gui`
- D7 smoke：`npm run smoke:desktop-shell`
- GUI 拖拽 smoke：`npm run smoke:desktop-gui`

## 3. 验证要点

- `shell-manifest.json` 中必须包含 `entrypoint: "index.html"`。
- `shell-manifest.json` 中 `window.state` 在打包时应为 `running`。
- `shell-manifest.json` 中 `layout` 长度必须为 4（四区）。

## 4. 与 pilot 的关系

- `desktop:pilot` 保留为命令行调试入口。
- `desktop:gui` 提供本地 HTTP GUI（导入/选择/编辑/移动/导出 + 预览区直接拖拽）用于人工测试。
- `desktop:gui` 预览层包含 `black_fill_guard`：对大面积黑填充 shape 仅在 GUI 预览转为线框，避免遮挡编辑视图（不改项目数据与正式导出）。
- 正式 GUI 壳以 `DesktopAppShell + shellDocument + release bundle` 为准。
