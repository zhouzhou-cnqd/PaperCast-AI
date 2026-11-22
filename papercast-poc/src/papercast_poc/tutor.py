"""语音导师核心逻辑：转写文本 → 证据检索 → LLM 文字回答。

配置 Qdrant 时优先使用多语言向量 + BM25 混合检索；未配置或请求失败时
回退到原有关键词实现。检索不到证据时明确回答"论文未提供"，不编造。
"""
from __future__ import annotations

import re

from .schemas import Evidence, ParsedPaper, TextBlock, TutorAnswer

# 中文提问 → 英文论文关键词（PoC 领域词表，覆盖 Docling 技术报告主题）
ZH_EN_GLOSSARY = {
    "表格": "table", "模型": "model", "布局": "layout", "识别": "recognition",
    "许可证": "license MITlicensed", "输出格式": "output format JSON Markdown",
    "输出": "output JSON Markdown",
    "性能": "performance", "速度": "speed", "页码": "page", "公式": "equation",
    "扫描": "scanned", "许可": "license", "开源": "open-source", "线程": "thread",
    "内存": "memory", "后端": "backend", "流水线": "pipeline", "扩展": "extend",
    "转换": "conversion", "文档": "document", "元数据": "metadata", "作者": "authors",
    "参考文献": "references", "批处理": "batch", "交互": "interactive", "硬件": "hardware",
    "哪些数据集": "dataset descriptions benchmarks", "数据集": "dataset",
    "训练": "trained", "检测": "detector", "单元格": "cell",
    "实验": "experiment", "故障诊断": "fault diagnosis", "扩散桥": "diffusion bridge",
    "渐进域适应": "gradual domain adaptation", "域适应": "domain adaptation",
    "目标域": "target domain", "源域": "source domain", "知识保留": "knowledge retention",
    "边界扩展": "boundary extension", "语义漂移": "semantic drift",
    "模块": "module", "组成": "components",
    "行列": "row column", "阅读顺序": "reading order", "图表": "figure",
    # 通用学术提问词（真人实测补充：如"采用的核心方法是什么"曾因词表缺失误判"论文未提供"）
    "核心方法": "core method approach architecture pipeline model framework components", "采用": "use employed",
    "方法": "method", "核心": "core", "架构": "architecture", "技术": "technology technique",
    "原理": "principle", "流程": "workflow pipeline", "特点": "feature", "功能": "feature",
    "优势": "advantage", "优点": "advantage", "缺点": "limitation", "局限": "limitation",
    "评估": "evaluation", "测试": "test", "准确": "accuracy", "创新": "novel",
    "贡献": "contribution", "实现": "implementation", "工具": "tool", "用途": "application",
    "应用": "application", "场景": "use case", "计划": "plan", "未来": "future",
}

TUTOR_SYSTEM_PROMPT = """你是科研论文的语音导师。学生正在听论文播客，暂停后向你提问。
硬性规则：
1. 只依据给定的论文证据回答，输出 JSON：{"answer": "...", "evidence_ids": ["ev_..."]}
2. answer 用清晰中文回答，1-2 句话、不超过 100 个汉字；术语准确。
3. evidence_ids 只能从给定证据列表中选，禁止编造；回答中的事实必须被所选证据支持。
4. 证据不足以回答时，answer 必须以"论文未提供"或"我不确定"开头说明，evidence_ids 可为空。
5. 不要冒充论文作者的结论；如需推断，明确说"这是我的分析"。"""


def extract_keywords(transcript: str) -> list[str]:
    """英文术语直接提取 + 中文按领域词表映射为英文关键词。"""
    kws = set(re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", transcript))
    for zh, en in ZH_EN_GLOSSARY.items():
        if zh in transcript:
            kws.update(en.split())
    if "哪些" in transcript and "数据集" in transcript:
        kws.update(("descriptions", "benchmarks"))
    return sorted(kws)


def retrieve_evidence_blocks(
    paper: ParsedPaper, transcript: str, limit: int = 5
) -> tuple[list[TextBlock], list[str]]:
    """按关键词命中数排序检索正文块（跳过标题）。返回 (块列表, 关键词)。"""
    kws = extract_keywords(transcript)
    scored: list[tuple[int, TextBlock]] = []
    for blk in paper.blocks:
        if blk.kind == "heading" or len(blk.text.strip()) < 40:
            continue
        low = blk.text.lower()
        hits = sum(1 for k in kws if k.lower() in low)
        if hits > 0:
            scored.append((hits, blk))
    scored.sort(key=lambda x: -x[0])
    return [b for _, b in scored[:limit]], kws


def answer_question(
    paper: ParsedPaper,
    transcript: str,
    evidence_pool: list[Evidence],
    llm=None,
    current_segment_text: str | None = None,
    resume_segment_id: str | None = None,
    resume_position_seconds: float = 0.0,
    retrieval_limit: int = 5,
    current_segment_evidence_ids: list[str] | None = None,
    retriever=None,
) -> tuple[TutorAnswer, dict]:
    """混合检索→LLM→引用校验；Qdrant 不可用时自动回退关键词检索。"""
    by_block = {e.block_id: e for e in evidence_pool}
    by_id = {e.evidence_id: e for e in evidence_pool}
    retrieved: list[Evidence] = []
    kws: list[str] = []
    report: dict = {}

    if retriever is not None:
        try:
            retrieved = retriever.retrieve(transcript, paper.paper_id, limit=retrieval_limit)
            report["retrieval_method"] = "qdrant_hybrid"
        except Exception as exc:  # 网络/凭据异常时保留可用的本地路径
            report["retrieval_error"] = type(exc).__name__

    if not retrieved:
        blocks, kws = retrieve_evidence_blocks(paper, transcript, limit=retrieval_limit)
        retrieved = [by_block[b.block_id] for b in blocks if b.block_id in by_block]
        report["retrieval_method"] = "keyword_fallback"

    report.update({"keywords": kws, "retrieved_evidence": [e.evidence_id for e in retrieved]})

    # 上下文兜底：提问过于通用（如"核心方法是什么"）导致关键词检索为空时，
    # 用正在听的段落的证据 + 段落文本关键词再检索，交给 LLM 判断证据是否足以回答。
    if not retrieved and (current_segment_evidence_ids or current_segment_text):
        fallback_ids: list[str] = list(current_segment_evidence_ids or [])
        if current_segment_text:
            ctx_blocks, ctx_kws = retrieve_evidence_blocks(paper, current_segment_text, limit=retrieval_limit)
            report["context_keywords"] = ctx_kws
            fallback_ids.extend(by_block[b.block_id].evidence_id for b in ctx_blocks if b.block_id in by_block)
        seen: set[str] = set()
        for eid in fallback_ids:
            if eid in by_id and eid not in seen:
                seen.add(eid)
                retrieved.append(by_id[eid])
            if len(retrieved) >= retrieval_limit + 3:
                break
        if retrieved:
            report["context_fallback"] = True
            report["retrieved_evidence"] = [e.evidence_id for e in retrieved]

    if not retrieved:
        answer = TutorAnswer(
            transcript=transcript,
            answer="论文未提供这方面的信息，我不确定，不能凭空回答你。",
            evidence_ids=[],
            resume_segment_id=resume_segment_id,
            resume_position_seconds=resume_position_seconds,
        )
        report["path"] = "no_evidence_short_circuit"
        return answer, report

    if llm is None:
        from .llm_adapter import DeepSeekLLM

        llm = DeepSeekLLM()

    lines = []
    if current_segment_text:
        lines.append(f"学生正在听的播客片段：{current_segment_text}")
    lines.append(f"学生提问：{transcript}")
    lines.append("可用证据（evidence_id | 页码 | 原文）：")
    for e in retrieved:
        excerpt = e.quote if len(e.quote) <= 2400 else f"{e.quote[:1200]} … {e.quote[-1200:]}"
        lines.append(f"{e.evidence_id} | p.{e.page} | {excerpt}")
    data = llm.chat_json(TUTOR_SYSTEM_PROMPT, "\n".join(lines), temperature=0.3, max_tokens=180)

    # 代码校验：剔除编造的引用 ID，不信任模型自报
    allowed = {e.evidence_id for e in retrieved}
    claimed = data.get("evidence_ids", []) or []
    valid = [i for i in claimed if i in allowed]
    invalid = [i for i in claimed if i not in allowed]
    answer_text = str(data.get("answer", "")).strip()
    unsupported: list[str] = []
    if answer_text.startswith(("论文未提供", "我不确定")):
        unsupported = valid
        valid = []
    report.update({
        "path": "llm_answer",
        "invalid_refs_removed": invalid,
        "unsupported_refs_removed": unsupported,
        "llm_usage": llm.usage_log,
    })

    answer = TutorAnswer(
        transcript=transcript,
        answer=answer_text,
        evidence_ids=valid,
        resume_segment_id=resume_segment_id,
        resume_position_seconds=resume_position_seconds,
    )
    return answer, report
