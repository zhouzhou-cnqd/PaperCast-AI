# 候选仓库核验报告（repo_audit）

> 核验时间：2026-11-17。方式：实际抓取 GitHub 页面 / raw README。未核验项明确标注。

## P0

### 1. mozilla-ai/document-to-podcast — ✅ 已核验（仅阅读文档，未运行）
- URL：https://github.com/mozilla-ai/document-to-podcast （可访问）
- 许可证：Apache-2.0（README 声明，LICENSE 文件待克隆后核对）
- Python：3.10+（Apple M 芯片 3.12+）；最低 RAM 8GB；磁盘 ≥20GB
- 安装：`pip install document-to-podcast`；CLI 支持 `--text_to_text_model` 指定 GGUF 模型
- 特点：全本地（无外部 API/GPU 必需），文档→双人对话→音频；官方示例含 "Attention is All You Need"
- 适配评估：流水线设计可参考；LLM/TTS 可替换性需读源码核验（待办）
- 风险：默认小模型（Qwen2.5-1.5B GGUF）中文脚本质量存疑，需实测

### 2. docling-project/docling — ✅ 已核验（仅阅读文档，安装进行中）
- URL：https://github.com/docling-project/docling （可访问）
- 许可证：代码 MIT；**模型权重许可需逐项另查**（README 明示）
- Python：3.10+（2.70.0 起弃 3.9）；Windows x86_64 支持
- 能力（README 声明，未实测）：版面/阅读顺序/表格/公式/代码、无损 JSON、Markdown 导出、页码 prov
- 官方示例直接解析 arXiv PDF，与本实验 A 需求高度匹配
- 风险：首次运行需下载布局/表格模型（约数百 MB）；页码可靠性需抽检验证

### 3. QwenLM/Qwen3-TTS — ✅ 已核验（raw README；GitHub 页面直连一次超时）
- URL：https://github.com/QwenLM/Qwen3-TTS （raw README 可访问）
- 发布：2026-01-22 开源 0.6B/1.7B（基于 Tokenizer-12Hz）
- 安装：`pip install -U qwen-tts`，官方推荐 Python 3.12 独立环境；FlashAttention2 可选（Windows 编译困难，可不用）
- 音色：CustomVoice 提供 **9 个预设音色**（性别/年龄/语言/方言组合）→ 双角色无需克隆真人，合规友好
- 权重下载：ModelScope（国内推荐）或 HuggingFace；0.6B-CustomVoice + Tokenizer 预计 ~2–3GB
- 许可：第三方来源称权重 Apache-2.0，**官方模型卡待核验**（见 license_audit.md）
- 显存：本机 RTX 3060 Ti 8GB（空闲 ~5.2GB），0.6B bf16 预计可行，1.7B 偏紧 — 未实测，不预设结论

## P1

### 4. FunAudioLLM/CosyVoice — ⚠️ 待核验
- GitHub 直连超时（本机网络对 github.com 部分连接不稳定，raw.githubusercontent.com 可用）
- 后续用 raw README 重试；当前不对其接口/许可下结论

### 5. SYSTRAN/faster-whisper — ⚠️ 待核验
- 计划实验 E 前核验；预期 CPU int8 可跑 small 模型（未验证）

### 6. hallelx2/notebooklm-web — ⚠️ 待核验（仅交互设计参考，不移植）

## P2

### 7. langchain-ai/langgraph — ⚠️ 待核验（PoC 暂不使用）

## 网络情况记录
- github.com 页面抓取：Mozilla ✅ / Docling ✅ / Qwen3-TTS 超时 1 次 / CosyVoice 超时 1 次
- raw.githubusercontent.com：Qwen3-TTS README ✅
- 结论：核验优先走 raw README；克隆仓库若失败改用镜像或 pip 包源码