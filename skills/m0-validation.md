# M0 Validation Skill

## 目的

在写任何业务代码前，验证规划书 §11 的不确定项，避免基于错误包名、过期 API、不可用服务或虚构配置开工。

## 输入

- 项目规划文档：`公司调研助手 — Codex 开发规划书 v1 0 c4b86d3bcea0416c8c691e336aaa7d45.md`
- 任务状态：`TASK.md`、`STATE.md`

## 输出

- 规划文档 §11 每个条目的验证结论。
- 如需调整技术选型，同步更新规划文档对应章节。
- `STATE.md` 更新当前进度。
- `LOG.md` 追加验证来源、结论、风险。

## 执行步骤

1. 逐项读取 `TASK.md` 的 M0 checklist。
2. 对开源项目优先读取官方 README、官方 docs、release 或源码入口。
3. 对 Python/Node 包可用 `pip index versions`、`uv`、`npm view` 等命令交叉核对。
4. 对价格、API 可用性、云服务变更必须联网核对官方页面。
5. 每个结论记录：来源、日期、决策、影响、未决风险。
6. 所有 M0 条目完成后，才允许进入 M1。

## 验收标准

- M0 checklist 全部有明确结论或显式 TODO。
- 没有任何“凭经验判断”的 API、模型名、端点、价格或配置项。
- `STATE.md` 当前步骤切换到 M1 前，`LOG.md` 已记录 M0 总结。
