# PaperCast PoC — 开源技术验证实验

对应任务书：`../PaperCast_Qoder_开源技术验证实验.md`。本目录仅做技术可行性验证（PoC），非最终产品。

## 状态看板

| 实验 | 状态 | 说明 |
|---|---|---|
| 环境检查 | ✅ 已完成 | 见 `reports/environment.md` |
| PoC 环境 | ✅ 已完成 | uv + Python 3.11，`uv.lock` 锁定；运行须 `--no-sync` 保护 CUDA torch |
| 仓库核验 | ✅ P0 已核验 | P1 部分核验，见 `reports/repo_audit.md` |
| A PDF 解析 | ✅ PASS | 双论文：Docling 9 页 / DBDA 12 页 IEEE，页码抽检确认 |
| B 播客脚本 | ✅ PASS | DeepSeek 双角色中文脚本，证据抽检通过 |
| C 双音色 TTS | ✅ PASS | Qwen3-TTS 本地双音色，用户试听确认 |
| D 端到端 | ✅ PASS | 双论文完整播客（19 段 / 16 段），证据链完整 |
| E 导师闭环 | ✅ PASS | 真人按住说话 Web 闭环：ASR → Qdrant Hybrid → DeepSeek 文字回答 |
| 本地演示验收 | ✅ 2026-11-22 | 20/20 真实语音问答，平均 3.68s；16 项测试通过；见 `reports/demo_acceptance_2026-11-22.md` |
| 前端 UI | ✅ 构建通过 | 深色主题一屏布局，当前段落自动定位；**人工视觉复核待做** |
| V1 公网部署 | ❌ 未实测 | **提交最大阻塞项**；S1–S7 核验与提交清单见 `reports/submission_checklist.md` |

> 提交准备：比赛截止 2026-11-30 18:00，逐项核对清单见 `reports/submission_checklist.md`。

## 环境

- Python 3.11（uv 管理，独立 `.venv`，不影响系统 Anaconda）
- 安装：`uv sync`
- ffmpeg：系统未安装，计划用 `imageio-ffmpeg` 提供的静态二进制替代（已在依赖中）

## 运行命令

```powershell
uv run python scripts/check_environment.py          # 环境自检，写入 reports/environment.md
uv run python scripts/experiment_pdf.py inputs/<paper>.pdf --paper-id paper_001   # 实验 A
```

### Qdrant 混合检索

在 `.env` 配置 `QDRANT_URL` 与 `QDRANT_API_KEY` 后，将现有证据池写入 Qdrant：

```powershell
.venv\Scripts\python.exe scripts\index_qdrant.py
```

本地服务会自动使用 Qdrant 多语言向量 + BM25 混合检索；未配置或请求失败时保留关键词回退。

## 结构说明

按任务书第 4 节目标结构创建；实验脚本随各实验推进逐步补齐（当前已建 A 相关代码）。
`third_party/` 用于克隆上游仓库（已 gitignore）；模型权重不提交 Git。

## 安全约定

- 密钥仅存 `.env`（已 gitignore），参考 `.env.example`，绝不打印/提交。
- 所有实测记录见 `reports/experiment_log.md`，区分「已实际运行 / 仅阅读文档 / 仅 Mock / 未测试」。
