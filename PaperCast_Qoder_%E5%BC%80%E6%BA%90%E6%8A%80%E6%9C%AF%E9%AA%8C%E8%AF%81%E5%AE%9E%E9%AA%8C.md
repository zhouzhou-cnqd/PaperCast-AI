# PaperCast AI — Qoder 开源技术验证实验任务书

> 版本：V0.1 · 日期：2026-11-17  
> 用途：交给 Qoder 在本地 Windows 环境开展**真实、可复现的技术验证**，不是直接开发最终参赛产品。  
> 原则：先验证开源项目能否运行、是否适配、能否衔接，再决定复用方案。**禁止将 Mock、静态样例或未运行代码报告为真实实验成功。**

## 0. 给 Qoder 的总指令

你是一名负责 AI 语音产品原型的高级工程师。请在当前工作区执行本任务书，先检查环境与已有文件，列出实验计划，再逐步实施。允许联网时优先查看仓库 README、LICENSE、requirements/pyproject、模型权重许可及最新提交；若无法联网，记录受阻情况，**不要编造仓库结构、版本、运行结果或许可证结论**。所有命令、日志、配置、生成样例和实验结论必须留在项目目录内。遇到需要 API Key、付费授权或下载大型权重时先报告选项和预计成本/大小，不要自行购买或泄露密钥。不要修改或删除用户已有项目文件。

## 1. 产品背景与实验目标

PaperCast AI 计划参加 2026 Qoder 高校创造力大赛 StudyHack 赛道。最终产品是“智能科研播客 + 按住说话的 AI 语音导师”：用户上传论文 PDF，选择学习目标，系统生成**双角色中文学术播客**；用户听到某一段时可以暂停、按住说话提问，AI 基于当前论文和播放上下文回答，并以语音播报，随后恢复原播放位置。

本轮**只做技术可行性验证（PoC）**，不做完整 React UI，不做比赛宣传页面，不部署生产服务。

需要回答五个问题：

1. 是否可以从真实科研 PDF 中提取准确的章节、正文、页码和证据？
2. 是否能从论文生成有逻辑的双人中文播客脚本，并保持事实可溯源？
3. 是否能将双人脚本合成为两种清晰可区分的中文音色？
4. 是否能将三个模块串起来，生成可播放音频及 `evidence_ids` 对照？
5. 是否能用录音 → ASR → 检索证据 → LLM 回答 → TTS，完成一次按住说话导师的最小闭环？第 5 项为加分验证，前三项成功后再做。

## 2. 候选开源仓库（必须核验，不预设其当前可用性）

| 优先级 | 仓库 | 地址 | 验证重点 |
|---|---|---|---|
| P0 | Mozilla document-to-podcast | https://github.com/mozilla-ai/document-to-podcast | 文档→对话脚本→音频的流水线；能否替换 LLM/TTS |
| P0 | Docling | https://github.com/docling-project/docling | 双栏、章节、表格、公式、页码提取 |
| P0 | Qwen3-TTS | https://github.com/QwenLM/Qwen3-TTS | 中文音色、接口、模型/显存要求、权重许可 |
| P1 | CosyVoice | https://github.com/FunAudioLLM/CosyVoice | TTS 备选方案；注意仓库真实地址及接口 |
| P1 | faster-whisper | https://github.com/SYSTRAN/faster-whisper | 语音识别及中文提问转写 |
| P1 | notebooklm-web | https://github.com/hallelx2/notebooklm-web | 引用、知识库、播客与问答交互设计，仅参考，不整体移植 |
| P2 | LangGraph | https://github.com/langchain-ai/langgraph | 可恢复状态机；PoC 可先不用 |

**核验要求**：逐项记录仓库 URL 是否可访问、最新 README 所需 Python/Node 版本、许可证文件、权重许可证（若有）、主要依赖、是否需要外部 API、是否提供示例和测试。对未核验项目标记“待核验”，不能直接称其满足需求。优先阅读上游文档而非凭经验猜命令。

## 3. 环境与安全要求

- 操作系统：Windows，终端：PowerShell；Python 优先通过 `uv` 管理，建议 Python 3.11；Node/npm 仅在需要时使用。
- 首先执行并保存：`python --version`、`uv --version`、`git --version`、`ffmpeg -version`、`nvidia-smi`（命令不存在时如实记录）。
- 允许先用 CPU/轻量服务验证流程；如本机显存不足，不强行下载或加载大模型。
- `.env` 加入 `.gitignore`；提供 `.env.example`，不打印、提交或上传任何真实密钥。
- 用户可能有 DeepSeek API，但**不得假定已配置或可用**。若存在 `DEEPSEEK_API_KEY`，仅检查是否设置，不输出值。外部 API 调用需要说明费用可能性。
- 测试 PDF：优先选择用户自己提供或明确可合法使用的开放获取论文；如果没有 PDF，先提供可用的公开论文下载建议并等待确认，或使用许可清晰的测试文档。不要凭空制造“真实论文解析成功”结论。
- 生成的声音仅使用授权模型与音色；不克隆未经许可的真人声音。

## 4. 工作区结构

在当前工作区下创建 `papercast-poc/`，不要覆盖已有文件：

```text
papercast-poc/
├── README.md
├── .gitignore
├── .env.example
├── pyproject.toml
├── configs/
│   └── providers.example.yaml
├── inputs/
│   └── README.md
├── outputs/
│   ├── pdf_parse/
│   ├── scripts/
│   ├── audio/
│   └── tutor/
├── scripts/
│   ├── check_environment.py
│   ├── experiment_pdf.py
│   ├── experiment_podcast.py
│   ├── experiment_tts.py
│   ├── experiment_pipeline.py
│   └── experiment_tutor.py
├── src/papercast_poc/
│   ├── __init__.py
│   ├── schemas.py
│   ├── pdf_adapter.py
│   ├── podcast_adapter.py
│   ├── llm_adapter.py
│   ├── tts_adapter.py
│   ├── asr_adapter.py
│   ├── evidence.py
│   └── pipeline.py
├── tests/
│   ├── test_schemas.py
│   ├── test_evidence.py
│   └── test_pipeline.py
└── reports/
    ├── environment.md
    ├── repo_audit.md
    ├── experiment_log.md
    ├── metrics.csv
    ├── license_audit.md
    └── final_recommendation.md
```

上述文件是目标结构，可根据实际需要调整，但要在 README 中说明。原始仓库可克隆到 `third_party/`，不要把大模型权重提交到 Git。

## 5. 实验 A：科研 PDF 解析（P0）

**任务**：安装或调用 Docling，解析至少 1 篇真实、可合法使用的英文科研 PDF；若有时间，再测试双栏、公式、表格较多的第二篇。

**产出**：

- `outputs/pdf_parse/paper.json`：论文 ID、页码、章节、正文块、文本块 ID。
- `outputs/pdf_parse/paper.md`：可读的 Markdown。
- `reports/experiment_log.md`：解析命令、耗时、错误、实际页数、提取文本长度。

**检查点**：人工核对至少 10 个文本块：页码、阅读顺序、章节归属、公式/表格保留情况；若 Docling 无法可靠保留页码，测试 PyMuPDF 补充页码映射，并如实记录局限。

**通过条件**：可将至少一篇真实 PDF 转为结构化内容，能从 10 个抽检块中定位原文页码；错误块必须记录，不以“无报错”代替质量验收。

## 6. 实验 B：双角色播客脚本（P0）

**任务**：研究 Mozilla document-to-podcast 的脚本生成链路；优先尝试运行官方最小示例。若其依赖与本地环境冲突，保留失败日志，采用适配器方式复用设计而非强行修改上游源码。

使用解析后的真实论文，生成 2–4 分钟的**中文双人科研对话**。角色：`host`（提出问题、串联结构）与 `researcher`（解释方法和证据）。可以通过已配置的 DeepSeek API 实现脚本生成。

脚本输出采用统一格式：

```json
{
  "paper_id": "paper_001",
  "segments": [
    {
      "segment_id": "seg_001",
      "speaker": "host",
      "text": "这篇论文试图解决什么问题？",
      "evidence_ids": ["ev_001"],
      "claim_type": "paper_fact"
    }
  ]
}
```

`claim_type` 可为 `paper_fact`、`explanation`、`inference`。`paper_fact` 必须绑定可定位的真实证据，`inference` 必须清楚标注为 AI 分析，不能冒充作者结论。引用 ID 不能仅靠模型自报，应由代码检查存在性，并人工抽查语义是否支持。

**通过条件**：生成完整双人脚本，结构校验通过，至少 10 条事实性表述完成证据抽检；若不足 10 条则全检。记录不支持、部分支持和完全支持的数量。

## 7. 实验 C：双音色 TTS（P0）

**任务**：评估 Qwen3-TTS 是否能在当前环境或合规 API 上使用；必要时测试 CosyVoice 或其他可用的合法 TTS Provider。不要预设模型一定能在本机显卡上运行。

定义统一接口：

```python
class TTSProvider:
    def synthesize(self, text: str, voice_id: str, output_path: str) -> str:
        """生成音频文件，返回实际文件路径；失败时抛出明确异常。"""
```

**测试**：至少 2 个不同音色，分别合成 3 段中文文本；记录输出格式、时长、耗时、是否存在吞字/错读/明显停顿。必要时使用 FFmpeg 统一为 WAV 或 MP3。

**通过条件**：能实际播放至少 6 段音频；不同角色音色可主观区分；有真实音频文件、日志与耗时记录。若未配置真实服务，仅可报告接口/Mock 测试通过，**TTS 实验仍标记未通过**。

## 8. 实验 D：最小端到端流水线（P0）

将 A、B、C 串起来：

```text
真实 PDF → 文本/页码/证据块 → 论文分析 → 双人脚本
       → 角色分配 → TTS 分段合成 → 音频清单/可选拼接
       → 片段到证据的映射
```

输出：

- `outputs/audio/segment_*.wav` 或 `.mp3`
- `outputs/audio/manifest.json`：`segment_id`、`speaker`、`text`、`audio_path`、`duration_seconds`、`evidence_ids`
- `outputs/audio/podcast.mp3`（能可靠拼接时）
- `reports/metrics.csv`：阶段耗时、生成音频时长、失败次数、重试次数和费用估计（无法核实则填 `unknown`）

**通过条件**：从真实 PDF 到可播放双角色播客，端到端运行一次，不允许人工拼接虚构结果；每段音频均可关联脚本和证据。

## 9. 实验 E：语音导师最小闭环（P1，可选）

使用 1 条用户本人录制或明确授权的短语音，验证：

```text
录音文件 → ASR 转写 → 读取当前 segment_id/evidence_ids
→ 检索论文证据 → LLM 回答 → TTS 导师音频
```

本轮不必实现浏览器按住说话 UI，可先通过本地音频文件模拟输入，但必须清楚标注是**文件驱动的语音闭环**，不是已完成浏览器交互。

导师回答输出 `transcript`、`answer`、`evidence_ids`、`audio_path`、`resume_segment_id`、`resume_position_seconds`。检索不到证据时明确说明“不确定/论文未提供”。

## 10. 验收矩阵

| 实验 | 必须提供的证据 | 判定 |
|---|---|---|
| A PDF 解析 | 真实 PDF、JSON/Markdown、抽检记录 | PASS / PARTIAL / FAIL / BLOCKED |
| B 脚本生成 | 结构化脚本、证据抽检、调用日志 | PASS / PARTIAL / FAIL / BLOCKED |
| C 双音色 TTS | 至少 6 段真实音频、时长、运行日志 | PASS / PARTIAL / FAIL / BLOCKED |
| D 端到端 | manifest、音频、运行命令、总耗时 | PASS / PARTIAL / FAIL / BLOCKED |
| E 导师闭环 | 输入录音、转写、证据、回答音频 | PASS / PARTIAL / FAIL / BLOCKED |

报告中必须区分：**已实际运行**、**仅阅读代码/文档**、**仅 Mock 测试**、**未测试**。不可将 README 声称的能力写成实测结果。

## 11. 最终需要 Qoder 交付的内容

1. 可复现的 PoC 源码、依赖锁定文件、运行命令。
2. `reports/repo_audit.md`：候选仓库适配性、依赖和维护风险。
3. `reports/license_audit.md`：代码、模型权重、声音素材及引用要求，未确认项单独列出。
4. `reports/experiment_log.md`：每次实际运行的命令、时间、错误和修复。
5. `reports/metrics.csv`：解析/生成/TTS 的实测时间和成本。
6. `reports/final_recommendation.md`：推荐的 PDF、播客、TTS、ASR 技术组合；明确哪些模块可直接复用、哪些需要适配、哪些应该自研。
7. 一个可播放的真实双人中文科研播客样例（若 P0 全部通过）。

最终报告需要给出下一阶段 PaperCast V1 开发的**最小依赖清单和技术决策**，并明确：是否值得使用 Mozilla 项目作为参考，Docling 是否满足页码溯源要求，Qwen3-TTS 是否适合当前机器/云端部署。

## 12. 执行顺序与停止条件

**顺序：环境检查 → 仓库核验 → A PDF → B 脚本 → C TTS → D 集成 → E 导师（可选） → 报告。**

遇到下列情况应暂停相关实验并请求用户决定：需要付费 API/购买资源；下载超大权重；涉及授权不明的模型或音色；现有工作区存在可能被覆盖的重要文件。可以继续执行不受阻的其他实验。

**第一条回复要求**：先向用户展示环境检测结果、预计下载量/潜在费用、优先验证的仓库和执行计划，然后开始能够安全运行的实验。不要一上来就生成完整产品页面。
