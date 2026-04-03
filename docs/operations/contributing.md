# 贡献流程

- Status: implemented
- Primary Source: documentation rebuild policy, repository practices
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 提交流程

1. 明确本次改动属于 `normative`、`implemented`、`gap` 或 `audit`。
2. 修改对应文档并更新元数据。
3. 若涉及实现行为变化，补充或更新 smoke 证据。
4. 更新 `docs/audit/current-verification-report.md`。

## 2. PR 必须说明

- 改动目标与范围
- 受影响模块
- 是否影响合同语义
- 验证命令与结果摘要
- 未完成项与风险

## 3. 禁止项

- 无证据声称“通过验收”。
- 将 smoke 结果替代 family-wise acceptance 结论。
- 未标注 gap 就改写规范语义。
