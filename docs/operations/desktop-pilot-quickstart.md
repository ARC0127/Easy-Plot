# Desktop Pilot 快速使用

- Status: implemented
- Primary Source: `scripts/desktop_pilot_cli.cjs`, `scripts/smoke_desktop_pilot.cjs`
- Last Verified: 2026-04-02
- Verification Mode: smoke rerun

## 1. 入口

- 命令：`npm run desktop:pilot`
- 该入口为命令行交互式 pilot，推荐用于快速调试和批处理。
- 正式 GUI 壳入口见 `docs/operations/desktop-shell-quickstart.md`。

## 2. 最小可用命令

- `open <file> [familyHint] [htmlMode]`
- `status`
- `select-first-text`
- `edit <text>`
- `save-project <file>`
- `export-svg <file>`
- `export-html <file>`
- `quit`

## 3. 批处理模式

- 命令：`node scripts/desktop_pilot_cli.cjs --batch <commands-file>`
- 参考验证：`npm run smoke:desktop-pilot`

## 4. 已知限制

- 当前不提供菜单/快捷键等桌面增强交互。
- 更适合脚本化与验证场景，不替代 GUI 壳发布流程。
