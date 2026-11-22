# PaperCast Site — 前端站点（本地功能测试 + S1 部署验证）

2026 Qoder 高校创造力大赛（StudyHack）作品 PaperCast AI 的前端站点。包含两个标签页：

1. **功能测试**（本地）：播放 PoC 生成的双人播客 + 段落/证据溯源 + 按住说话 AI 语音导师
   （录音 → ASR → Qdrant/关键词检索 → DeepSeek 文字回答 → 点击来源 → 手动恢复播放）。
   依赖本地后端 `../papercast-poc/scripts/serve_local.py`（仅绑定 127.0.0.1，非部署方案）。
2. **S1 部署验证**：原平台能力验证页（清单 S1–S7 见 `../papercast-poc/reports/final_recommendation.md`）。

## 本地功能测试运行方式

两个终端分别启动：

```powershell
# 终端 1：后端（papercast-poc 目录；必须 --no-sync 保护 CUDA torch）
uv run --no-sync python scripts/serve_local.py --port 8000 --warmup

# 终端 2：前端（papercast-site 目录）
npm run dev
```

浏览器打开 vite 给出的地址（默认 http://localhost:5173），允许麦克风权限。
`/api` 与 `/audio` 已由 vite 代理到 127.0.0.1:8000（dev 与 preview 均生效）。

- 首次提问需加载 ASR 模型，建议启动后端时带 `--warmup` 或页面点「预热模型」
- 问答产物落盘 `../papercast-poc/outputs/tutor_web/`（录音和结果 JSON）
- 需要 `papercast-poc/.env` 中已配置 `DEEPSEEK_API_KEY`
- 配置 `QDRANT_URL` 与 `QDRANT_API_KEY` 后启用混合检索；未配置时自动使用关键词回退

## 本地运行（仅静态页）

```powershell
npm install
npm run dev      # 本地开发
npm run build    # 类型检查 + 产出 dist/
npm run preview  # 预览构建产物
```

## 发布（S1 验证步骤）

1. 在 Qoder 中打开本目录，点击「站点」发布（由用户触发）
2. 访问策略设为 **public**，拿到 `*.qoder.zone` 公网链接
3. 打开链接，切到「S1 部署验证」标签，点击「运行客户端自检」，截图留证
4. 将链接与结果记录到 `../papercast-poc/reports/experiment_log.md`

注意：公网发布后「功能测试」标签不可用（本地后端不上公网），V1 需按 S2–S7 核验结果改造为云端函数。

## 后续（S2–S7）

服务端函数、数据库、音频存储、外部 API 出口的平台约定**尚未核验**，
待 S1 发布成功后按 Qoder Sites 实际提供的能力逐步添加，不预设接口形态。
