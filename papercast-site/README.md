# PaperCast AI — 公网站点

2026 Qoder 高校创造力大赛（StudyHack）作品。公网地址：

https://papercast-ai-koyte7vo1mh.qoder.zone

## 线上产品

- 两篇预置论文的双角色中文播客、章节跳转和播放位置恢复。
- 点击开始录音、再次点击结束，实时显示波形；浏览器完成中文语音转写。
- 语音不可用时可直接输入问题。
- Qoder Deno Function 在节目文本中检索并返回短文字回答；无依据时明确拒答。
- 公开响应不含论文原文。
- 「S1 部署自检」可检查 HTTPS、麦克风、录音格式、静态数据、音频 Range、边缘函数和问答闭环。

## 本地开发

开发模式使用 `../papercast-poc/scripts/serve_local.py` 的高质量基线（faster-whisper + Qdrant/关键词检索 + DeepSeek）：

```powershell
# papercast-poc
uv run --no-sync python scripts/serve_local.py --port 8000 --warmup

# papercast-site
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。Vite 将 `/api` 与 `/audio` 代理至 `127.0.0.1:8000`。

只检查生产静态播客可运行 `npm run prepare:static && npm run build && npm run preview`；本地 preview 不模拟 Qoder Function，问答应在公网或 Deno 环境验证。

## 构建与检查

```powershell
npm run prepare:static
npm run build
deno check --node-modules-dir=none functions/index.ts
deno test --node-modules-dir=none functions/handler.test.ts
deno lint functions/handler.ts functions/handler.test.ts functions/index.ts
```

`prepare:static` 从 PoC 的两份播客 manifest 生成 `public/data`、复制音频，并生成边缘函数使用的节目数据。生产构建位于 `dist/`，边缘函数位于 `functions/`。

## 部署边界

公网 MVP 使用静态播客 + 浏览器语音识别/文字输入 + Deno 边缘检索，不托管 faster-whisper 模型，也不要求客户端密钥。本地 Python 链路保留为生成、评测和后续语义检索升级的基线。
