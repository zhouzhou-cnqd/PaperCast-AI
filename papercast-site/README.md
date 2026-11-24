# PaperCast AI — 公网站点

2026 Qoder 高校创造力大赛（Hack4Good｜认知无障碍科研）作品。

- 在线体验：https://papercast-ai-koyte7vo1mh.qoder.zone
- 公开源码：https://github.com/zhouzhou-cnqd/PaperCast-AI

## 线上产品

- 10 篇预置论文的双角色中文播客，每篇 16–20 段，支持章节跳转和播放位置恢复。
- 公网同时支持文字提问和“点击开始—点击停止”的可选语音输入；识别结果先进入输入框，允许修改后再提问。
- 论文问答统一调用 DeepSeek，并用论文完整 Docling 解析文本约束回答；不再提供容易误判概括问题的关键词快速模式。
- 深度问答不限制调用次数；API Key 仍只保存在服务端，不进入浏览器。
- 无依据时明确回答“论文未提供”，公开响应不返回论文原文。
- 「S1 部署自检」检查 HTTPS、视口、静态数据、音频 Range、边缘函数、问答闭环和原文保护。

当前版本不支持在线上传 PDF。PDF 解析、证据构建、脚本生成和 TTS 仍由本地原版流水线完成，再把授权的预生成资源发布到站点。

## 本地开发

开发模式保留 `../papercast-poc/scripts/serve_local.py` 的本地完整链路（faster-whisper + Qdrant/关键词检索 + DeepSeek）：

```powershell
# papercast-poc
uv run --no-sync python scripts/serve_local.py --port 8000 --warmup

# papercast-site
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。Vite 将 `/api` 与 `/audio` 代理至 `127.0.0.1:8000`。本地开发使用原始 faster-whisper 链路；生产环境由 Qoder Function 读取 `DASHSCOPE_API_KEY`，调用通义千问 ASR。`DASHSCOPE_WORKSPACE_ID` 可选，配置后使用北京地域业务空间专属域名。

只检查生产静态资源可运行 `npm run prepare:static && npm run build && npm run preview`。本地 preview 不模拟 Qoder Function，问答应在公网或 Deno 环境验证。

## 构建与检查

```powershell
npm run prepare:static
npm run build
deno check --node-modules-dir=none functions/handler.ts functions/handler.test.ts
deno test --allow-env --node-modules-dir=none functions/handler.test.ts
deno lint functions/handler.ts functions/handler.test.ts functions/index.ts
```

`prepare:static` 会从 PoC 的 10 份流水线结果生成：

- `public/data/`：浏览器可读取的论文与播客元数据，不含原文；
- `public/audio/`：预生成节目音频；
- `functions/data/podcasts.ts`：播客章节与问答兜底证据；
- `functions/data/evidence.ts`：12,758 个完整解析文本块，仅进入服务端部署包，不进入公开仓库。

生产构建位于 `dist/`，边缘函数位于 `functions/`。

## 部署边界

公网产品采用静态音频 + React UI + Qoder Deno Function + DeepSeek，并以通义千问 ASR 提供可选语音输入。边缘函数先在当前论文的完整解析文本中检索候选证据，再把最多 10 条证据交给 DeepSeek；ASR 不可用时仍可使用文字输入，DeepSeek 不可用时明确报错而不返回低质量关键词匹配结果。公网不托管 faster-whisper 或 Qwen3-TTS 权重，也不要求访客提供密钥。

本地 Python 链路保留为内容生成、语音问答、Qdrant Hybrid 评测和后续升级的高质量基线。
