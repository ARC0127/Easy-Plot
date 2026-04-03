# 文档编写约定

- Status: implemented
- Primary Source: documentation rebuild policy, repository structure
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 必填头部元数据

每篇正式文档必须包含：

- `Status`: `normative` / `implemented` / `gap` / `audit`
- `Primary Source`: PDF section、代码路径、脚本路径
- `Last Verified`: `YYYY-MM-DD`
- `Verification Mode`: `doc-only review` / `smoke rerun` / `historical only`

## 2. 证据引用规范

- 规范性描述必须引用 PDF section 范围。
- 实现性描述必须给出具体代码路径或脚本命令。
- 审计结论必须给出“命令 + 结果摘要”。

## 3. 状态词定义

- `supported`: 当前有实现证据且满足合同边界。
- `partial`: 有实现，但能力范围或稳定性不完整。
- `missing`: 当前仓库缺失目标能力或入口。
- `honest-labeled`: 对不支持能力做了明确限制说明。

## 4. 书写要求

- 中文为主，保留英文标识符（类型名、函数名、错误码）。
- 禁止把“计划项”写成“已交付项”。
- 禁止用模糊词替代阈值或合同（例如“差不多可用”）。
