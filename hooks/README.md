# Hooks

本目录记录项目建议的确定性校验点。当前先用文档形式约束，后续可落地为 git hooks、CI 或 Codex 自动化。

## Pre-Work

- 读取 `AGENTS.md`、`TASK.md`、`STATE.md`。
- 若当前步骤是 M0，不允许写业务实现代码。
- 若要新增外部依赖，先核对官方来源并记录到 `LOG.md`。

## Pre-Commit

- 不允许提交真实密钥或 `.env`。
- 前端变更运行 lint/typecheck/test 中的可用命令。
- Python 服务变更运行 unit test、import check 或 healthcheck。

## Pre-Completion

- 对照 `TASK.md` 完成标准核对。
- 更新 `STATE.md` 的阶段状态。
- 在 `LOG.md` 追加：操作、结果、验证、下一步。
