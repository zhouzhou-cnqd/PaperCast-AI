"""证据构建与脚本证据校验：引用 ID 由代码检查存在性，不信任模型自报。"""
from __future__ import annotations

from collections import defaultdict

from .schemas import Evidence, ParsedPaper, PodcastScript, TextBlock


def build_evidence(paper: ParsedPaper, min_chars: int = 40) -> list[Evidence]:
    """从正文/表格块构建证据池（跳过标题与过短块）。"""
    pages_by_text: dict[str, set[int | None]] = defaultdict(set)
    for block in paper.blocks:
        pages_by_text[block.text.strip()].add(block.page)
    repeated_headers = {
        text for text, pages in pages_by_text.items()
        if len(text) < 200 and len(pages) >= 2
    }
    evidences: list[Evidence] = []
    for blk in paper.blocks:
        if (
            blk.kind == "heading"
            or len(blk.text.strip()) < min_chars
            or blk.text.strip() in repeated_headers
        ):
            continue
        evidences.append(
            Evidence(
                evidence_id=f"ev_{len(evidences) + 1:03d}",
                block_id=blk.block_id,
                page=blk.page,
                section=blk.section,
                quote=blk.text.strip(),
            )
        )
    return evidences


def validate_script_evidence(script: PodcastScript, evidences: list[Evidence]) -> dict:
    """返回校验报告：缺失引用、无证据的 paper_fact 等。semantic 支持度需人工抽检。"""
    known = {e.evidence_id for e in evidences}
    missing: list[dict] = []
    facts_without_evidence: list[str] = []
    fact_count = 0
    for seg in script.segments:
        for eid in seg.evidence_ids:
            if eid not in known:
                missing.append({"segment_id": seg.segment_id, "evidence_id": eid})
        if seg.claim_type == "paper_fact":
            fact_count += 1
            if not seg.evidence_ids:
                facts_without_evidence.append(seg.segment_id)
    return {
        "ok": not missing and not facts_without_evidence,
        "total_segments": len(script.segments),
        "paper_fact_segments": fact_count,
        "missing_evidence_refs": missing,
        "facts_without_evidence": facts_without_evidence,
        "note": "本校验仅检查引用存在性；语义支持度需人工抽检并记录到 experiment_log.md",
    }


def find_blocks_by_keyword(paper: ParsedPaper, keyword: str, limit: int = 5) -> list[TextBlock]:
    """导师闭环用的朴素证据检索（PoC 阶段关键词匹配，后续可换向量检索）。"""
    kw = keyword.lower()
    hits = [b for b in paper.blocks if kw in b.text.lower()]
    return hits[:limit]
