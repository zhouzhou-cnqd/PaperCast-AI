# 实验日志（experiment_log）

> 分类标注：【已实际运行】【仅阅读文档】【仅 Mock】【未测试】

## 2026-11-17 环境检查【已实际运行】
- 命令：`python --version; uv --version; git --version; ffmpeg -version; nvidia-smi`
- 结果：Python 3.12.7（Anaconda base）、uv 0.11.24、git 2.54.0、**ffmpeg 未安装**、RTX 3060 Ti 8GB（占用 2887MiB / 8192MiB）
- 命令：检查 `DEEPSEEK_API_KEY` 存在性 → **NOT SET**；node v24.15.0 / npm 11.12.1
- 决策：用 uv 建 Python 3.11 独立环境；ffmpeg 用 imageio-ffmpeg 静态二进制替代（待实测）

## 2026-11-17 仓库核验【仅阅读文档】
- Mozilla document-to-podcast：GitHub README 抓取成功（Apache-2.0，Python 3.10+，本地流水线）
- Docling：GitHub README 抓取成功（MIT 代码，Python 3.10+，页码/表格/公式能力为声明未实测）
- Qwen3-TTS：github.com 页面超时 1 次 → raw README 抓取成功（qwen-tts 包，0.6B/1.7B，9 预设音色）
- CosyVoice：github.com 直连超时，**待核验**
- 详见 repo_audit.md / license_audit.md

## 2026-11-17 PoC 环境搭建【已实际运行】
- 命令：`uv python install 3.11; uv sync`（首次误用 base 3.12.7，写入 `.python-version=3.11` 后重建）
- 结果：`.venv` = CPython **3.11.15**；安装 117 包（docling 2.150.1、pymupdf 2.1、torch 2.15.0 CPU 版、imageio-ffmpeg 0.8.1 等）；`uv.lock` 已生成（191 包全量锁定，extras 未安装）
- 下载耗时：首次约 1m38s + 重建 1m09s（torch Windows CPU wheel 121MB）
- 验证：`uv run python -c "import docling, pymupdf, pydantic"` ✅
- 命令：`uv run pytest tests -q` → **7 passed in 1.32s**【代码级测试，非真实实验结论】
- 修复：pdf_adapter 中 `import fitz` 弃用警告 → 改为 `import pymupdf`
- 注意：Docling 布局/表格模型权重尚未下载（首次解析时自动下载，约数百 MB）；实验 A 等待测试 PDF 确认

## 实验 A 第一次运行 — 失败与修复【已实际运行】
- 测试 PDF：arXiv 2408.09869v5（Docling Technical Report），5,566,575 bytes，sha256=82dd470712ce8389f19f20eb9330475e2166a281f8c7990a9f1d0763d73b4d22，许可 **CC BY 4.0**（已核验 arXiv 页）
- 命令：`uv run python scripts/experiment_pdf.py inputs/2408.09869.pdf --paper-id docling_tech_report`
- **失败**：`OSError: [WinError 1314] 客户没有所需的特权`——huggingface_hub 在非管理员 Windows 下创建符号链接失败（模型 docling-layout-heron）
- **修复**：设置 `HF_HUB_DISABLE_SYMLINKS=1`（已写入 pdf_adapter.py 的 os.environ.setdefault，终端环境变量双保险），缓存改用文件复制
- 附注：首次已下载 layout 模型 ~164MB + timm ViT 系列（tableformer 依赖），重跑走缓存
- 重跑：进行中，结果见下节

## 待用户决策（暂停项）
1. 测试 PDF 选择（建议 arXiv 1706.03762 或 2408.09869，或用户自有 PDF）
2. 实验 B LLM：DeepSeek Key（按量计费，预计每脚本 < ¥0.1）或本地 GGUF 小模型（~1.6GB 免费）
3. 实验 C：Qwen3-TTS 0.6B 权重下载授权（~2–3GB，免费）
## 实验 A — 2026-11-18T10:21:29

- 命令：`uv run python scripts/experiment_pdf.py inputs/2408.09869.pdf --paper-id docling_tech_report`
- 输入：inputs/2408.09869.pdf
- 统计（实测）：

```json
{
  "parse_seconds": 818.2,
  "num_pages": 9,
  "num_blocks": 798,
  "total_text_chars": 54815,
  "blocks_missing_page_before_fallback": 0,
  "blocks_missing_page_after_fallback": 0,
  "num_tables": 3,
  "docling_status": "ConversionStatus.SUCCESS"
}
```
- 待办：人工抽检 ≥10 个文本块的页码/阅读顺序/章节归属，并记录于此。
 
## 2026-11-18 实验 A 复核收口【已实际运行】
- 新增脚本：`scripts/review_spotcheck.py`（可疑块深挖：6 词短语跨页强校验 + 所标页原文上下文 + heading 结构 + 乱码扫描）
- 命令：`uv run python scripts/review_spotcheck.py` → 生成 `reports/pdf_spotcheck_review.md`
- 命令：PyMuPDF 全页检索 `publication repositories` / `government` → 9 页矢量文本层均无；p9 含 3 张嵌入图片
- 命令：导出 p9 嵌入图片 → `outputs/pdf_parse/p9_images/p9_img{1,2,3}.png`（供目检 OCR 块）
- 结论（详见 pdf_spotcheck.md）：
  - blk_0331 乱码为**源 PDF 字体编码缺陷**（PyMuPDF 原文同样乱码），页码 p7 正确，非 Docling 错误
  - blk_0727 为 **Docling 对 p9 位图区域的 OCR 文本**（默认管线开启位图 OCR），故 PyMuPDF 交叉校验无法命中；OCR 准确性待目检图片
  - Table 1 标题强命中 p5；主报告章节序列正确；附录 section 标签受内嵌样例文档标题干扰（局限已记录）
- **实验 A 判定：PASS（附局限）**，12/13 抽检块页码确认，满足 ≥10 块溯源条件
- 环境复查：`DEEPSEEK_API_KEY` 仍 **NOT SET**（仅检查存在性）→ 实验 B 维持 BLOCKED
- 遗留：① p9_images 目检确认 blk_0727 OCR 准确性（用户）；② 实验 B 等待 LLM 决策；③ 实验 C 等待权重下载授权（~2–3GB）

## 2026-11-18 S1 站点骨架搭建【已实际运行】
- 决策：用户同意「实验 B（待 Key）+ S1 部署验证」并行推进
- 新建 `../papercast-site/`（Vite 5.4.21 + React 18 + TS 5.6，独立于 papercast-poc，不覆盖已有文件）
- 内容：S1 验证页（客户端自检按钮：同源 fetch 时延/运行环境/构建时间）+ S1–S7 平台验证清单展示
- 命令：`npm install --no-audit --no-fund; npm run build`
- 结果：`tsc --noEmit` 通过；vite build 成功，dist/index.html 0.34KB + JS 144.82KB（gzip 47.59KB），构建 549ms
- 密钥复查：`.env` 不存在，`DEEPSEEK_API_KEY` NOT SET；`.env.example` 模板已就绪（含 DeepSeek/HF 镜像/TTS_PROVIDER 项）
- **待用户操作**：① 在 Qoder 中打开 papercast-site 点「站点」发布，设 public，回传公网链接与自检截图 → S1 判定；② 复制 `.env.example` 为 `papercast-poc/.env` 并填入 DeepSeek Key → 解锁实验 B
- 未核验项不变：Sites 函数运行时/超时/存储配额（S2–S7），不预设接口形态

## 2026-11-18 S0 站点本地测试【已实际运行】
- **用户决策**：暂不部署公网，先本地测试通过再说 → S1–S7 推迟，新增 S0 本地验证项
- 命令：`npm run preview -- --port 4173 --strictPort`（后台运行，服务 papercast-site/dist 构建产物）
- 命令：`Invoke-WebRequest http://localhost:4173/` → **HTTP 200**，345 bytes，标题含 "PaperCast AI" ✅
- 命令：`Invoke-WebRequest http://localhost:4173/assets/index-DYDfGihq.js` → **HTTP 200**，145,321 bytes（与构建产物一致）✅
- 待用户本地确认：浏览器打开 http://localhost:4173 ，检查页面渲染、点击「运行客户端自检」按钮、控制台 0 报错（比赛作品要求桌面/手机控制台无报错）
- 判定：S0 HTTP 层 **PASS**；浏览器交互层待用户确认

## 2026-11-18 S0 浏览器控制台问题修复【已实际运行】
- 用户回传 localhost:4173 控制台日志，逐条归因：
  - `AutoWork content.js` 相关报错 → **浏览器扩展注入**，与站点无关，忽略（建议用 InPrivate 复核）
  - `LanguageDetector` 提示 → Edge 内置功能信息提示，非报错，忽略
  - `favicon.ico 404` → **站点缺 favicon**，需修复 ✅
- 修复：新增 `papercast-site/public/favicon.svg`（麦克风图标）+ index.html 声明 `<link rel="icon">`
- 命令：`npm run build` → 构建成功 611ms（JS hash 更新为 index-DRuF1blo.js，体积不变 gzip 47.60KB）
- 验证：`Invoke-WebRequest http://localhost:4173/favicon.svg` → **HTTP 200**，497 bytes；HTML 含 icon 声明 ✅
- 待用户：强刷页面（Ctrl+F5）后复查控制台；建议 InPrivate 窗口排除扩展噪音，确认站点自身 0 报错

## 2026-11-18 blk_0727 隐藏文本机制查明 + P1 仓库核验补完【已实际运行 / 仅阅读文档】

### blk_0727 最终诊断【已实际运行】
- 新脚本：`scripts/verify_ocr_block.py`（RapidOCR 独立复核）、`scripts/diag_ocr_locate.py`（全页 OCR 定位）
- 修正：venv 实测 OCR 引擎为 **rapidocr 3.10.0 + onnxruntime**（非 easyocr，Docling 2.150 默认）；首版脚本 import easyocr 失败后改用 RapidOCR
- 修复：Windows GBK 控制台打印 OCR 文本 UnicodeEncodeError → `sys.stdout.reconfigure(encoding="utf-8", errors="replace")`
- 排查链（命令均为 uv run python + pymupdf/rapidocr 内联或脚本）：
  1. p9 三张嵌入位图 OCR（2.6s/1.1s/1.5s）→ 目标短语无命中
  2. p9 整页 200dpi 渲染 OCR（9.0s）→ 无命中
  3. 全 9 页 300dpi 渲染 OCR（共约 52s，报告 reports/ocr_locate_diag.md）→ government 全文档 0 命中
  4. p8/p9 OCR 全文落盘 + 宽松词片（govem/offices/skewed/scanned/repositor/patents/websites）→ 全 0，排除字形混淆
  5. PyMuPDF INFINITE_RECT 提取 p9 → 仍 2752 字符，排除 CropBox 外文本
  6. 邻块分析：blk_0727–0733 为 DocLayNet 数据集章节连续段落，整段 PyMuPDF 不可见
  7. **XObject 检查**：p7/p8/p9 各含 Form XObject（Im3/Im4/Im5），BBox `[0 0 684 454]` 等 = 原始 DocLayNet 页（612×792）的局部裁剪；无嵌入附件
- **结论**：docling-parse 提取了 Form XObject **BBox 裁剪区外的隐藏文本**；页码 prov 无误但文本渲染不可见。早期"OCR 恢复文本"推断不成立，已在 pdf_spotcheck.md 更正
- **实验 A 判定更新**：blk_0727 改判"已记录的错误块（隐藏文本伪影）"，A 维持 PASS（附局限），局限 3 条
- **V1 决策新增**：证据管线必须加 PyMuPDF 可见性交叉校验（spotcheck 机制产品化），或实测对比 pypdfium backend
- 产物：reports/pdf_spotcheck_review.md（最终诊断节）、reports/ocr_locate_diag.md、outputs/pdf_parse/page_renders/、outputs/pdf_parse/ocr_text/

### P1 仓库核验补完【仅阅读文档】
- CosyVoice：raw README 抓取成功 → Fun-CosyVoice3-0.5B 最新，conda py3.10，FastAPI/gRPC 部署，许可待核验（详见 repo_audit.md）
- faster-whisper：raw README 抓取成功 → py3.9+，pip 安装，**无需系统 FFmpeg**（PyAV），CPU int8 small 可行（声明未实测），许可待核验
- notebooklm-web：仍待核验（仅交互参考，不阻塞）

## 2026-11-18 实验 B 就绪准备【已实际运行】
- 用户决策：先配置 DeepSeek Key
- 命令：`Copy-Item .env.example .env` → `.env` 已创建（Key 留空待用户填写，已 gitignore）
- 命令：`uv sync --extra llm` → 安装 openai 3.54.0 + jiter/sniffio/truststore（纯 Python 小包）；`import openai` ✅
- 预演：`uv run python scripts/experiment_podcast.py`（无 Key）→ 证据池构建成功 **221 条**（outputs/podcast/evidence_pool.json），随后在 LLM 边界**显式抛出 LLMNotConfiguredError** ✅（符合"绝不静默 Mock"要求）
- 状态：实验 B 全链路就绪，唯一等待项 = 用户在 `.env` 填入 `DEEPSEEK_API_KEY`

## 2026-11-18 实验 B 语义抽检收口【已实际运行 + 人工语义判定】
- 用户已配置 Key（仅检查存在性：SET，未输出值）；实验 B 实际运行成功（见上节自动日志）
- 新脚本：`scripts/spotcheck_podcast.py` → 生成 reports/podcast_spotcheck.md 段落-证据对照表
- 补充核验：ev_003/ev_023/ev_025/ev_031 完整原文导出核对（对照表展示截断 300 字符，判定前已查全文）
- 语义判定（10/10 全检）：**完全支持 8 / 部分支持 2 / 不支持 0**
  - seg_001 部分支持："最近发布"时间修饰无证据
  - seg_002 部分支持："Python 包"不在所引 ev_003 内（论文 p2 可证，属引用覆盖不全）
- 改进项（V1 prompt 约束）：禁止无证据时间修饰；细节表述须补引对应证据块
- **实验 B 判定：PASS**（详见 reports/podcast_spotcheck.md 汇总）
- LLM 用量：prompt 3337 / completion 1596 tokens，单次调用，无重试；费用估算 < ¥0.1（按 deepseek-chat 牌价量级估算，实际账单未核实）
- 下一步：实验 C（等待 Qwen3-TTS 0.6B 权重下载授权 ~2–3GB）→ 实验 D 端到端

## 2026-11-18 实验 C 环境准备：权重下载 + CUDA torch【已实际运行】
- 用户授权挂机下载 → `scripts/download_models.py`：Qwen3-TTS-12Hz-0.6B-CustomVoice **2498.4MB/46s** ✅、Qwen3-TTS-Tokenizer-12Hz **682.3MB/16s** ✅（ModelScope）、faster-whisper-small **486.2MB/143s** ✅（HF 直连）；共 3666.9MB，日志 reports/download_log.md
- 依赖：`uv sync --extra tts --extra asr` 安装 qwen-tts 0.1.1 等；**副作用：openai 被卸载**（uv 只保留指定 extras）→ `uv sync --extra llm --extra tts --extra asr` 恢复 ✅
- CUDA torch 切换波折（如实记录）：
  - pyproject 加官方 cu128 索引 + tool.uv.sources → `uv sync` 91ms 完成但 torch 未切换（原因未查明，日志 reports/sync_cuda.log）
  - 换阿里云镜像（format=flat）+ `uv lock --upgrade-package torch` → 仍未切换（reports/lock_cuda.log）
  - **最终方案（用户手动执行成功）**：`uv pip install torch==2.9.1+cu128 torchaudio==2.9.1+cu128 --find-links https://mirrors.aliyun.com/pytorch-wheels/cu128/` → **torch 2.9.1+cu128, cuda=True, RTX 3060 Ti** ✅
  - 遗留：uv.lock 仍记录 CPU 版 → **跑实验必须用 `uv run --no-sync` 或 .venv\Scripts\python.exe**，锁文件修复待办
- 首跑实验 C 失败：`operator torchvision::nms does not exist`（torchvision 0.29.2 配 torch 2.15 的旧版）→ 阿里云镜像 403（限流）→ 官方源 `uv pip install torchvision==0.24.1+cu128 --index-url https://download.pytorch.org/whl/cu128` ✅
- 三件套对齐实测：torch 2.9.1+cu128 / torchvision 0.24.1+cu128 / torchaudio 2.9.1+cu128，cuda=True
- 官方模型卡核验（本地权重内 README.md）：**权重 Apache-2.0** ✅；9 预设音色表；**Ryan 母语为英语** → 中文播客改用 host=Vivian / researcher=Uncle_Fu（均中文母语）；speech_tokenizer 已内置于主权重目录，可离线加载
- license_audit.md 已关闭 Qwen3-TTS 权重/音色许可待核验项
- 实验 C 重跑进行中：`uv run --no-sync python scripts/experiment_tts.py --model-dir third_party/models/Qwen3-TTS-12Hz-0.6B-CustomVoice --host-voice Vivian --researcher-voice Uncle_Fu`

## 2026-11-18 实验 C 合成完成【已实际运行】
- 结果：**6 段真实音频全部生成**（Vivian 中文女声 ×3 / Uncle_Fu 中文男声 ×3），无失败无重试
- 每段合成耗时（GPU，RTX 3060 Ti）：45.0s / 36.2s / 13.1s / 50.0s / 5.9s / 81.2s，合计 **231.4s**
- 音频时长：20.64 + 20.56 + 7.20 + 28.24 + 3.28 + 46.64 = **128.06s（2 分 08 秒）**，符合 2–4 分钟目标
- RTF ≈ 1.81（慢于实时；未装 flash-attn 走 manual attention，PoC 可接受，V1 云 API 无此问题）
- 显存占用：**1689MiB / 8192MiB**，余量充足；模型加载自本地权重，全程离线
- 产物：outputs/tts/seg_00{1..6}_*.wav + podcast_preview.wav（6.1MB 拼接预览）+ tts_report.json
- **待用户试听**：① 两音色是否可主观区分 ② 中文发音是否清晰无吞字 ③ 停顿是否自然 → 试听通过后实验 C 判 PASS
- 下一步：实验 D 端到端（需新建 pipeline.py + experiment_pipeline.py，一次运行串联 A→B→C→manifest）

## 2026-11-18 实验 C 验收 PASS + 实验 D 启动【已实际运行 + 用户决策】
- **用户试听 podcast_preview.wav 反馈"很好"** → 音色区分度/中文发音/停顿主观验收通过 → **实验 C 判定：PASS**
- 新建实验 D 代码（复用 A/B/C 适配器，无人工拼接）：
  - `src/papercast_poc/pipeline.py`：run_pipeline（完整链路）/ run_pipeline_from_paper（可单测入口）；输出 manifest.json（segment_id/speaker/text/audio_path/duration_seconds/evidence_ids/claim_type）、podcast.wav/mp3、pipeline_report.json（阶段耗时/失败/重试/token 用量）
  - `audio_utils.export_mp3`：imageio-ffmpeg 静态二进制导出 MP3（无需系统 ffmpeg）
  - `scripts/experiment_pipeline.py`：运行入口，自动追加 metrics.csv 与本日志
  - `tests/test_pipeline.py`：4 个代码级单测（Mock 标注清晰：manifest 证据映射/重试/持续失败抛错/Mock 模式标记）
- 修复：pytest 临时目录 C 盘 Temp 权限拒绝（WinError 5）→ pyproject 配置 `--basetemp=.pytest_tmp`（项目内，已 gitignore）
- 单测：`uv run --no-sync pytest tests -q` → **11 passed in 2.01s**（7 旧 + 4 新）【代码级测试，非实验结论】
- **实验 D 正式运行已启动（后台）**：`uv run --no-sync python scripts/experiment_pipeline.py`
  - 输入：inputs/2408.09869.pdf（真实 PDF，重新解析）；LLM：DeepSeek 真实调用；TTS：本地 Qwen3-TTS GPU，全部 18 段
  - 预计 15–25 分钟；结果待运行完成后记录

## 2026-11-19 实验 D 端到端运行完成【已实际运行】
- 命令：`uv run --no-sync python scripts/experiment_pipeline.py`（真实 PDF + DeepSeek + 本地 Qwen3-TTS GPU，一次运行无人工拼接）
- **结果：mode=real，19 段全部合成，0 失败 0 重试**
- 阶段耗时（实测）：parse **72.63s**（GPU 加速后比首次 CPU 818s 快 ~11×）/ evidence ~0s / script 11.87s / tts 875.75s / concat 3.19s；**总计 963.44s ≈ 16 分钟**
- 音频总时长：**427.72s（7 分 08 秒）**；podcast.mp3 3.11MB
- LLM 用量：prompt 3337 / completion 1890 tokens（单次调用）；费用估算 < ¥0.1（账单未核实）
- manifest 代码核验（已实际运行）：19 段音频文件全部存在 ✅；无效证据引用 **0** ✅；10 条 paper_fact 全部绑定证据 ✅
- ⚠️ **偏差记录**：音频 7 分钟超出任务书 2–4 分钟目标（脚本 prompt 写了 2–4 分钟但 LLM 按文本量估计失准）。改进项（V1）：按"字数→秒数"预算约束每段长度与总段数，或生成后按时长裁剪。PoC 样例可播放性不受影响
- 附注：RapidOCR 的 onnxruntime 无 CUDA provider（仅 CPU），不影响结果；docling 主模型已走 GPU
- 产物：outputs/pipeline/audio/{segment_001..019_*.wav, manifest.json, podcast.wav, podcast.mp3} + pipeline_report.json；metrics.csv 已自动追加
- **待用户试听 podcast.mp3** → 通过后实验 D 判 PASS，P0 四关（A/B/C/D）全部完成

## 2026-11-19 实验 D 判定 PASS + 实验 E 实现【已实际运行 + 用户决策】
- **用户决策**："长度没关系，不是关键，看重实现程度" → 7 分钟时长偏差由用户明确接受，不作为验收障碍
- **实验 D 判定：PASS**（任务书条件全部满足：真实 PDF 端到端一次运行、无人工拼接、19 段音频均可关联脚本与证据、manifest 核验 0 缺失）→ **P0 四关 A/B/C/D 全部 PASS**
- 按用户"看重实现程度"推进加分项实验 E，新建：
  - `src/papercast_poc/asr_adapter.py`：FasterWhisperASR（本地 small 权重，CPU int8；Windows GPU 需 cuDNN9 DLL，PoC 用 CPU 足够快）
  - `src/papercast_poc/tutor.py`：关键词+中英领域词表检索（PoC 级，V1 换向量检索）、无证据短路回答"论文未提供"、LLM 引用 ID 代码校验剔除编造
  - `scripts/experiment_tutor.py`：文件驱动闭环（合成提问输入，Apache-2.0 授权音色，**明确标注非真人录音、非浏览器交互**）；双用例：可回答 + 论文未提供
  - `tests/test_tutor.py`：4 用例（词表映射/检索排序/短路/编造引用剔除）
- 单测：`uv run --no-sync pytest tests -q` → **15 passed in 3.93s**【代码级测试】
- 实验 E 真实运行已启动（后台）：ASR + DeepSeek + Qwen3-TTS 全真实服务

## 2026-11-19 实验 E 运行完成与验收【已实际运行】
- 命令：`uv run --no-sync python scripts/experiment_tutor.py`（全真实服务：faster-whisper small CPU int8 + DeepSeek + Qwen3-TTS GPU）
- **用例 1（可回答）**：合成提问"Docling 的表格结构识别用的是什么模型？"
  - ASR 转写："Docaling的表格结构识别用的是什么模型?"（⚠️ 品牌词误识 Docling→Docaling，small 模型真实局限，如实记录；检索靠词表关键词 table/model/recognition 仍命中正确证据 → 闭环对 ASR 噪声鲁棒）
  - 回答：TableFormer，绑定 ev_003+ev_021，编造引用 0
  - **语义核验（已实际运行）**：回答中"最先进/团队近期开发开源/提供预训练权重"逐词对应 ev_021 原文 ✅
  - LLM 用量：733 in / 60 out tokens
- **用例 2（论文未提供）**："作者在论文里致谢了哪些家庭成员？"
  - ASR 转写准确；检索命中 4 条弱相关证据（authors 关键词），**LLM 正确判断证据不足**，回答以"论文未提供"开头，evidence_ids=[]，不编造 ✅
  - LLM 用量：544 in / 37 out tokens
- 播放上下文：seg_002，resume_position=12.6s（模拟听到一半暂停）；两条导师回答音频已生成（Uncle_Fu 音色）
- 产物：outputs/tutor/{q1,q2}_*.wav/json + tutor_report.json
- **实验 E 判定：PASS（文件驱动闭环）**——输入为授权模型合成语音（非真人录音）、非浏览器交互，均已如实标注；任务书要求的 transcript/answer/evidence_ids/audio_path/resume_* 全部产出
- 遗留可选项：① 用户试听两条导师回答音频 ② 真人录音复测（`--audio 路径`）③ V1 改进：ASR 热词偏置/更大模型、向量检索替代词表
- **至此任务书五个实验 A/B/C/D/E 全部 PASS**（E 为文件驱动口径）
## 2026-11-18 实验 C — 2026-11-18T16:58:34【已实际运行】

- 命令：`uv run python scripts/experiment_pdf.py inputs/2408.09869.pdf --paper-id docling_tech_report`
- 证据池：221 条；segments：16
- 代码校验：{"attempt": 1, "validation": {"ok": true, "total_segments": 16, "paper_fact_segments": 9, "missing_evidence_refs": [], "facts_without_evidence": [], "note": "本校验仅检查引用存在性；语义支持度需人工抽检并记录到 experiment_log.md"}}
- LLM 用量：[{"prompt_tokens": 3337, "completion_tokens": 1499}]
- 待办：人工抽检 ≥5 个 paper_fact 段的语义支持度（对照 evidence_pool.json 原文）。

## 2026-11-18 实验 C — 2026-11-18T18:01:53【已实际运行】

- 命令：`uv run python scripts/experiment_pdf.py inputs/2408.09869.pdf --paper-id docling_tech_report`
- 证据池：221 条；segments：18
- 代码校验：{"attempt": 1, "validation": {"ok": true, "total_segments": 18, "paper_fact_segments": 10, "missing_evidence_refs": [], "facts_without_evidence": [], "note": "本校验仅检查引用存在性；语义支持度需人工抽检并记录到 experiment_log.md"}}
- LLM 用量：[{"prompt_tokens": 3337, "completion_tokens": 1596}]
- 待办：人工抽检 ≥5 个 paper_fact 段的语义支持度（对照 evidence_pool.json 原文）。

## 实验 C — 2026-11-19T10:57:11【已实际运行】

- 命令：`uv run python scripts/experiment_tts.py`
- 音色：{"host": "Vivian", "researcher": "Uncle_Fu"}；段数：6；总时长：128.1s
- 明细见 outputs/tts/tts_report.json；待办：人工试听音色区分度/中文发音/停顿。

## 实验 D — 2026-11-19T11:46:21【已实际运行】

- 命令：`uv run --no-sync python scripts/experiment_pipeline.py`
- 输入：F:\qoder_test\papercast-poc\inputs\2408.09869.pdf
- 报告：{
  "mode": "real",
  "paper_id": "docling_tech_report",
  "num_evidence": 221,
  "num_segments": 19,
  "stage_seconds": {
    "parse": 72.63,
    "evidence": 0.0,
    "script": 11.87,
    "tts": 875.75,
    "concat": 3.19
  },
  "tts_seconds_per_segment": [
    60.18,
    49.33,
    13.29,
    63.15,
    12.08,
    80.84,
    13.9,
    75.59,
    9.52,
    49.34,
    15.13,
    82.5,
    14.4,
    100.27,
    8.28,
    94.49,
    10.2,
    74.1,
    44.19
  ],
  "total_audio_seconds": 427.72,
  "failures": 0,
  "retries": 0,
  "llm_usage": [
    {
      "prompt_tokens": 3337,
      "completion_tokens": 1890
    }
  ],
  "cost_estimate": "unknown（token 用量见 llm_usage，实际账单未核实）",
  "podcast_wav": "F:\\qoder_test\\papercast-poc\\outputs\\pipeline\\audio\\podcast.wav",
  "podcast_mp3": "F:\\qoder_test\\papercast-poc\\outputs\\pipeline\\audio\\podcast.mp3",
  "manifest": "F:\\qoder_test\\papercast-poc\\outputs\\pipeline\\audio\\manifest.json",
  "parse_stats": {
    "parse_seconds": 56.97,
    "num_pages": 9,
    "num_blocks": 798,
    "total_text_chars": 54815,
    "blocks_missing_page_before_fallback": 0,
    "blocks_missing_page_after_fallback": 0,
    "num_tables": 3,
    "docling_status": "ConversionStatus.SUCCESS"
  },
  "total_seconds": 963.44
}
- 待办：人工试听 podcast.mp3；核对 manifest 每段 evidence_ids 可溯源。

## 实验 E — 2026-11-19T20:07:02【已实际运行】

- 命令：`uv run --no-sync python scripts/experiment_tutor.py`
- 模式：文件驱动语音闭环（合成提问输入，非真人录音、非浏览器交互，已如实标注）
- 用例：['q1_answerable', 'q2_unanswerable']；详见 outputs/tutor/tutor_report.json
- 待办：人工试听导师回答音频；如有真人录音可用 --audio 复测。

## 2026-11-19 本地功能测试界面搭建【代码已建，未运行】
- 用户需求：做前端界面实测功能（播客播放 + 真人按住说话提问）
- 新增 `scripts/serve_local.py`：纯标准库 ThreadingHTTPServer（零新依赖，保护手动安装的 CUDA torch），仅绑定 127.0.0.1；
  路由：GET /api/health、/api/podcast、/audio/<file>（支持 Range），POST /api/ask（录音→ASR→检索→DeepSeek→TTS，复用 tutor.answer_question）、POST /api/warmup；推理串行锁；问答产物落盘 outputs/tutor_web/
- 前端 `../papercast-site/src/App.tsx` 重写：双标签（功能测试 / S1 部署验证原页保留）；
  功能测试页 = 播客播放器 + 段落列表（点击跳转/当前段高亮/证据 chip 展开原文+页码）+ 按住说话（MediaRecorder，pointer 事件）
  → 回答音频播完自动恢复原播放位置；模型就绪徽章 + 预热按钮；vite.config.ts 增加 /api、/audio 代理到 127.0.0.1:8000
- 静态检查：get_problems 0 问题（TS/Python 语法层）；**尚未实际运行**，不构成功能结论
- 事故记录：本次追加日志时编辑失败导致文件被截断为前 58 行，已依据会话内完整读取的原 310 行内容全量恢复并追加本节
- 待办：① 启动后端（uv run --no-sync python scripts/serve_local.py --warmup）+ 前端 npm run dev；
  ② npm run build 类型检查；③ 用户浏览器实测：播放/跳转/证据展开/真人按住说话提问（首次加载模型约 1–2 分钟）

## 2026-11-19 工作区文件丢失事故与恢复【已实际运行】
- **现象**：会话期间发现多处文件丢失/回退（无 git 仓库，疑似 IDE 检查点回滚或同步盘还原，原因待用户确认）：
  - papercast-site：package.json / index.html / tsconfig.json / public/favicon.svg 整文件丢失；vite.config.ts 头部 import 丢失
  - papercast-poc/src：tutor.py / asr_adapter.py / pipeline.py 丢失；scripts：experiment_pipeline.py / experiment_tutor.py / download_models.py / review_spotcheck.py / verify_ocr_block.py / diag_ocr_locate.py / spotcheck_podcast.py 丢失；tests：test_pipeline.py / test_tutor.py 丢失
  - reports/experiment_log.md 被回退至 11-18 上午状态（58 行）
- **恢复（已完成）**：
  - experiment_log.md：依据会话内完整读取的原 310 行内容全量恢复（25 章节/关键数据抽查齐全）
  - tutor.py / asr_adapter.py / experiment_tutor.py：依据会话内完整读取内容**原样恢复**
  - package.json（按 package-lock.json 精确版本重建）/ index.html / tsconfig.json / favicon.svg / vite.config.ts import：重建
  - pipeline.py：源码未读过无法原样恢复 → 复制 __pycache__/pipeline.cpython-311.pyc 为 pipeline.pyc（无源导入兜底，**源码恢复待办**）
- **仍未恢复**：experiment_pipeline.py、download_models.py、review_spotcheck.py、verify_ocr_block.py、diag_ocr_locate.py、spotcheck_podcast.py、test_pipeline.py、test_tutor.py、pipeline.py 源码
- 音频/数据产物核验：outputs/pipeline/audio 19 段 wav + podcast.mp3(3,109,292B) + manifest、outputs/tts、outputs/tutor 提问/回答音频**全部完好**
- 建议：尽快 git init + 首次提交保护成果（待用户确认）；排查回滚原因

## 2026-11-19 本地功能测试界面运行验证【已实际运行】
- 前端构建：`npm run build` → tsc --noEmit 通过 + vite build 成功（JS 155.13KB / gzip 51.43KB，699ms）
- 后端启动：`.venv\Scripts\python.exe scripts/serve_local.py --port 8000 --warmup` → 启动成功，模型预热完成
- 前端启动：`npm run dev` → http://localhost:5173
- 连通性（经 vite 代理实测）：/api/health → {ok:true, deepseek_key_set:true, asr_loaded:true, tts_loaded:true}；首页 HTTP 200；HEAD /audio/podcast.mp3 → 3,109,292 bytes ✅
- **/api/ask 端到端实测**（输入 outputs/tutor/q1_answerable_question_synthetic.wav，模拟浏览器提交）：HTTP 200，
  ASR "Docaling的表格结构识别用的是什么模型?"（3.2s，品牌词误识与实验 E 一致，检索鲁棒）→ 回答 TableFormer，
  绑定 ev_003+ev_021，编造引用 0 → 回答音频 answer_001.wav 生成 → resume seg_002@12.6s 正确；全链路 55.14s（TTS 为主）
- 产物：outputs/tutor_web/ask_001*.{wav,json}；LLM 单次调用（费用 < ¥0.01 量级，账单未核实）
- **待用户浏览器实测**：打开 http://localhost:5173 → 允许麦克风 → 播放播客/点段落跳转/展开证据 → 按住说话真人提问（预期响应约 1 分钟，TTS 合成占大头）

## 2026-11-19 真人实测反馈与两处缺陷修复【已实际运行】
- **用户真人按住说话实测 2 次**（项目首次真人语音闭环，产物 outputs/tutor_web/ask_002/003.webm）：
  - ask_002 "你好你好"：ASR 准确（2.6s），无关键词→短路拒答（合理），resume seg_004@62.41s，20.03s
  - ask_003 "采用的核心方法是什么"：ASR 准确（2.27s），**keywords=[] → 误判"论文未提供"（检索假阴性，该答未答）**，14.88s
- **缺陷 1（检索假阴性）修复**：tutor.py 词表补 24 个通用学术词（方法/核心/架构/评估等）；
  answer_question 新增 current_segment_evidence_ids 参数 + 上下文兜底（关键词检索为空时用当前段落证据+段落文本关键词再检索，交 LLM 判断）；serve_local.py 传入段落证据 ID
- **缺陷 2（前端回答音频无声，用户截图 0:00/0:00）**：submitQuestion 把 src 设到即将被 React 卸载的隐藏 audio 元素，
  重渲染后新元素无 src → 不播放且 onEnded 自动恢复失效。修复：App.tsx 改为**始终挂载同一 audio 元素**（display 切换），删除条件渲染副本
- **缺陷 3（重启覆盖产物）**：serve_local 计数器重启归零会覆盖历史 ask 文件 → 改为从已有 ask_* 文件初始化（本次重启前 ask_001 冒烟产物已被回放覆盖，如实记录）
- **修复验证（回放用户原始录音 ask_003.webm，同上下文 seg_004@66.69s）**：HTTP 200，
  keywords=[core, method] → 检索 5 条证据 → 回答"Docling 核心是可定制模型流水线（BaseModelPipeline/Callable）"，
  绑定 ev_028/029/030，编造引用 0；**语义抽查**：BaseModelPipeline/Callable 均在证据池原文命中 ✅；
  ASR 3.51s，全链路 99.41s（回答较长→TTS 变慢，V1 需流式/分段合成或云 API）
- 前端 `npm run build` → tsc + vite 通过（155.10KB / gzip 51.42KB）；后端已重启（--warmup），vite dev 热更新生效
- 遗留局限（V1）：词表检索仍非向量检索；长回答 TTS 等待偏长；ASR 品牌词误识（Docaling）；寒暄类输入可加友好引导而非拒答
- **待用户复测**：刷新 http://localhost:5173 → 重问"采用的核心方法是什么"（应能回答）+ 确认回答语音自动播放、播完自动恢复播客

## 2026-11-19 差距评估与路线图 V1.0【文档产出 + 联网核验】
- **用户决策**：① 检索升级向量检索+向量数据库；② 解决 TTS 等待久；③ 增加人性化处理；要求评估现状与理想差距
- 联网核验（仅阅读文档口径）：DashScope qwen3-tts-flash / cosyvoice-v3-flash 存在且支持 SSE 流式（官方文档 2026-11-13）；
  第三方实测 TTFA 97–120ms（最优环境，非生产端到端，口径已区分）；BGE-M3 MIT/100+语言/1024 维/跨语言检索（多源一致）；Chroma 轻量本地向量库
- 产出 `reports/gap_analysis_and_roadmap.md`：现状实测基线（真人问答 14.9–99.4s，TTS 占 80%+）→ 理想目标（TTFA≤3s、召回≥90%）
  → 差距矩阵 → 三专项设计（A 向量检索 bge-m3+Chroma+评测集；B 长度预算/分句流水线/云流式三层；C 意图路由/即时反馈/可打断等 6 项）
  → 工程健康/S1–S7/前端产品化 → 11 天倒排计划 → 4 项用户决策点（git 授权/bge-m3 下载 ~2.3GB/云 API 预算/向量库确认）
- 关键架构结论：99s 实测问答 > Sites 传闻 60s 超时 → 分阶段任务+轮询为必选项，分句流水线与之天然契合
- 状态：文档完成；**向量检索/TTS 改进代码尚未实施**，等待用户对决策点 1–3 的授权后按 D0→D3 推进

## 实验 A — 2026-11-21T20:03:57

- 命令：`uv run python scripts/experiment_pdf.py inputs\diffusion_bridge_gda_fault_diagnosis.pdf --paper-id diffusion_bridge_gda_fault_diagnosis`
- 输入：inputs\diffusion_bridge_gda_fault_diagnosis.pdf
- 统计（实测）：

```json
{
  "parse_seconds": 68.2,
  "num_pages": 12,
  "num_blocks": 485,
  "total_text_chars": 71657,
  "blocks_missing_page_before_fallback": 0,
  "blocks_missing_page_after_fallback": 0,
  "num_tables": 2,
  "docling_status": "ConversionStatus.SUCCESS"
}
```
- 待办：人工抽检 ≥10 个文本块的页码/阅读顺序/章节归属，并记录于此。

## 实验 B — 2026-11-21T20:15:39【已实际运行】

- 命令：`uv run python scripts/experiment_podcast.py`
- 证据池：173 条；segments：16
- 代码校验：{"attempt": 1, "validation": {"ok": true, "total_segments": 16, "paper_fact_segments": 8, "missing_evidence_refs": [], "facts_without_evidence": [], "note": "本校验仅检查引用存在性；语义支持度需人工抽检并记录到 experiment_log.md"}}
- LLM 用量：[{"prompt_tokens": 2818, "completion_tokens": 1428}]
- 待办：人工抽检 ≥5 个 paper_fact 段的语义支持度（对照 evidence_pool.json 原文）。

## 实验 C — 2026-11-21T20:21:29【已实际运行】

- 命令：`uv run python scripts/experiment_tts.py`
- 音色：{"host": "Vivian", "researcher": "Uncle_Fu"}；段数：6；总时长：116.6s
- 明细见 outputs/tts/tts_report.json；待办：人工试听音色区分度/中文发音/停顿。

## 实验 C — 2026-11-21T21:55:23【已实际运行】

- 命令：`uv run python scripts/experiment_tts.py`
- 音色：{"host": "Vivian", "researcher": "Uncle_Fu"}；段数：16；总时长：272.0s
- 明细见 outputs/tts/tts_report.json；待办：人工试听音色区分度/中文发音/停顿。

## 实验 C — 2026-11-21T21:59:10【已实际运行】

- 命令：`uv run python scripts/experiment_tts.py`
- 音色：{"host": "Vivian", "researcher": "Uncle_Fu"}；段数：16；总时长：272.0s
- 明细见 outputs/tts/tts_report.json；待办：人工试听音色区分度/中文发音/停顿。
