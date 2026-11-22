from papercast_poc.schemas import Evidence, ParsedPaper, TextBlock
from papercast_poc.tutor import answer_question, extract_keywords


class _Retriever:
    def retrieve(self, question, paper_id, limit=5):
        return [Evidence(
            evidence_id="ev_001", block_id="b1", page=1,
            section="Method", quote="The paper discusses model speed.",
        )]


class _LLM:
    usage_log = []

    def chat_json(self, *args, **kwargs):
        return {"answer": "论文未提供用户满意度调查结果。", "evidence_ids": ["ev_001"]}


class _FailingRetriever:
    def retrieve(self, *args, **kwargs):
        raise RuntimeError("Qdrant unavailable")


class _StaticRetriever:
    def __init__(self, evidence):
        self.evidence = evidence

    def retrieve(self, *args, **kwargs):
        return [self.evidence]


class _FallbackLLM:
    usage_log = []

    def chat_json(self, *args, **kwargs):
        return {"answer": "论文采用扩散桥模型。", "evidence_ids": ["ev_001"]}


class _CapturingLLM:
    usage_log = []

    def chat_json(self, system, user, **kwargs):
        self.user = user
        return {"answer": "未来工作已说明。", "evidence_ids": ["ev_001"]}


def test_unanswerable_response_has_no_misleading_sources():
    paper = ParsedPaper(paper_id="p1", source="paper.pdf", num_pages=1)
    evidence = Evidence(
        evidence_id="ev_001", block_id="b1", page=1,
        section="Method", quote="The paper discusses model speed.",
    )
    answer, report = answer_question(
        paper, "有满意度调查吗？", [evidence], llm=_LLM(), retriever=_Retriever()
    )
    assert answer.evidence_ids == []
    assert report["unsupported_refs_removed"] == ["ev_001"]


def test_dataset_question_expands_to_description_terms():
    keywords = extract_keywords("实验使用了哪些故障诊断数据集？")
    assert "descriptions" in keywords and "benchmarks" in keywords


def test_qdrant_failure_falls_back_to_local_keywords():
    block = TextBlock(
        block_id="b1", paper_id="p1", page=1, section="Method",
        text="The core method uses a diffusion bridge model for domain adaptation.",
    )
    paper = ParsedPaper(paper_id="p1", source="paper.pdf", num_pages=1, blocks=[block])
    evidence = Evidence(
        evidence_id="ev_001", block_id="b1", page=1,
        section="Method", quote=block.text,
    )
    answer, report = answer_question(
        paper, "核心方法是什么？", [evidence], llm=_FallbackLLM(), retriever=_FailingRetriever()
    )
    assert answer.answer == "论文采用扩散桥模型。"
    assert report["retrieval_error"] == "RuntimeError"
    assert report["retrieval_method"] == "keyword_fallback"


def test_long_evidence_keeps_tail_in_prompt():
    paper = ParsedPaper(paper_id="p1", source="paper.pdf", num_pages=1)
    evidence = Evidence(
        evidence_id="ev_001", block_id="b1", page=1,
        section="Conclusion", quote="A" * 2500 + "FUTURE_WORK_MARKER",
    )
    llm = _CapturingLLM()
    answer_question(paper, "未来工作是什么？", [evidence], llm=llm, retriever=_StaticRetriever(evidence))
    assert "FUTURE_WORK_MARKER" in llm.user
