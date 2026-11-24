# PaperCast AI 提交核对清单

> 更新：2026-11-24 · 截止：2026-11-30 18:00（北京时间）
> 口径：✅ 已实测；🔄 需要账号或现场人工操作；⚠️ 已知限制。

## 1. 比赛硬要求

| 要求 | 状态 | 当前证据 |
|---|---|---|
| Qoder Sites 公网发布、无需登录 | ✅ | https://papercast-ai-koyte7vo1mh.qoder.zone 可访问，站点为 public |
| 核心流程可完成 | ✅ | 选论文 → 播放/章节跳转 → 文字提问 → 快速或深度回答 → 恢复播放 |
| 服务端密钥，不进入浏览器 | ✅ | DeepSeek 与额度校验都在 Qoder Function；前端构建无 Key |
| 桌面和移动端可用 | ✅ 自动项 | 响应式断点、生产构建、HTTP 和页面截图已验证；提交前仍建议真机打开一次 |
| 3–5 分钟演示 | ✅ | `reports/demo_script.md` 已按文字问答与 10 篇论文重写 |
| 作品帖 | ✅ 草稿 | `reports/submission_post_draft.md` 已更新；团队信息、视频链接需提交人填写 |
| 冻结版本 | ✅ | 最终源码、文档与截图提交后创建 `competition-v1.0` 标签 |
| 天池论坛发布 | 🔄 用户操作 | 需用参赛账号在 2026-11-30 18:00 前发布 |

## 2. 当前产品验收口径

| 项目 | 当前实现/实测 |
|---|---|
| 内容库 | 10 篇预置论文，每篇 16–20 段，共 183 段 |
| 播客 | 双角色中文音频、章节定位、拖动播放、播放位置恢复 |
| 公网输入 | 纯文字提问，不依赖麦克风权限或浏览器语音识别 |
| 快速模式 | 节目文本轻量检索，适合事实型短问题 |
| 深度模式 | DeepSeek + 服务端完整解析文本；每位访客最多 3 次 |
| 深度语料 | 12,758 个 Docling 文本块，最多取 10 条候选证据 |
| 检索基线 | 旧 10 问评测 10/10 Top-3 命中；公网完整语料回归同题 10/10 |
| 深度回答回归 | 最终公网回归返回 381 个字符、采用 6 条证据，路径 `deepseek_grounded_answer` |
| 测试 | Deno 9/9；TypeScript + Vite 构建通过 |
| 安全 | 原始 PDF、`.env`、API Key 和服务端全文语料均不进入浏览器响应 |

本地原版另完成 16 项 Python 测试、20/20 语音问答稳定性测试，平均 3.68 秒、P95 4.0 秒。该数据属于本地 faster-whisper + Qdrant + DeepSeek 链路，不冒充公网指标。

## 3. 发布前自动任务

- [x] 10 篇论文静态数据与音频生成
- [x] 完整解析文本打入服务端部署包
- [x] 公网 DeepSeek 深度问答与 3 次额度限制
- [x] 公网改为纯文字提问
- [x] 深色主题与移动端布局
- [x] README、验收报告、演示脚本、作品帖更新
- [x] 最终执行 `prepare:static`、构建、Deno 测试、主题断言和公网回归
- [x] 更新桌面/移动端截图
- [x] 提交并推送，创建 `competition-v1.0` 标签

## 4. 仅提交人能完成

1. 在 DeepSeek 与 Qdrant 控制台轮换曾用于开发的密钥，并把新 DeepSeek Key 同步到 Qoder Secret。
2. 在作品帖填入团队名、成员、学校/组织和演示视频链接。
3. 用 Android 或 iOS 真机打开公网，完成一次选论文、播放、文字提问和深度回答；无需再测录音。
4. 将最终作品帖发布到天池论坛并完成比赛提交确认。

## 5. 已知限制

- 当前是 10 篇精选论文的预置内容库，不支持网页上传 PDF。
- 互动回答仅输出文字；播客本体是音频。
- 深度模式依赖 DeepSeek 外部服务，单访客限 3 次；快速模式可作为稳定兜底。
- 全文被服务端用于检索和回答约束，但公开 API 不直接返回原文。
- 学习目标选择与账号系统不在本次比赛版本范围。

## 6. 最终提交包

- 公网：https://papercast-ai-koyte7vo1mh.qoder.zone
- GitHub：https://github.com/zhouzhou-cnqd/PaperCast-AI
- 架构图：`docs/diagrams/architecture.svg`
- 功能图：`docs/diagrams/features.png`
- 页面截图：`docs/screenshots/desktop.png`、`docs/screenshots/mobile.png`
- 演示脚本：`reports/demo_script.md`
- 作品帖：`reports/submission_post_draft.md`
