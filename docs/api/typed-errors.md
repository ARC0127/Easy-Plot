# Typed Errors

- Status: implemented
- Primary Source: `Figure Editor Complete Requirements Spec V1.pdf` (Section 12.7), `packages/ir-schema/src/errors.ts`
- Last Verified: 2026-04-02
- Verification Mode: doc-only review

## 1. 错误码列表

| Error Code | 目标语义 | 当前定义 |
| --- | --- | --- |
| `ERR_PARSE_FAILED` | 输入解析失败 | yes |
| `ERR_UNSUPPORTED_HTML_MODE` | HTML 模式不支持 | yes |
| `ERR_DYNAMIC_HTML_NOT_SUPPORTED` | 动态 HTML 不支持 | yes |
| `ERR_TEXT_EDIT_UNSUPPORTED` | 对不可编辑文本执行编辑 | yes |
| `ERR_OBJECT_NOT_FOUND` | 对象不存在 | yes |
| `ERR_SCHEMA_VALIDATION_FAILED` | schema 校验失败 | yes |
| `ERR_EXPORT_FAILED` | 导出失败 | yes |
| `ERR_REIMPORT_FAILED` | 重导入失败 | yes |
| `ERR_CAPABILITY_CONFLICT` | 能力冲突/非法能力 | yes |
| `ERR_INVALID_MANUAL_PROMOTION` | 手动提升非法 | yes |

## 2. 代码入口

- `FigureEditorError` class: `packages/ir-schema/src/errors.ts`

## 3. 使用约束

- 禁止 silent failure，必须抛 typed error 或在报告中标记受限模式。
