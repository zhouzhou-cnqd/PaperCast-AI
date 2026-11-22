"""固定中文问题集：验证 Docling 论文的 Qdrant Top-3 检索质量。"""
from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv

from papercast_poc.qdrant_retrieval import QdrantRetriever


CASES = [
    ("Docling 是什么，使用什么许可证？", {"ev_003"}),
    ("为什么 PDF 难以转换为机器可处理格式？", {"ev_004"}),
    ("Docling 支持输出哪些格式？", {"ev_006", "ev_013"}),
    ("Docling 的处理流水线包括哪些主要步骤？", {"ev_016", "ev_028", "ev_029"}),
    ("默认 PDF 后端是什么，还支持什么备选后端？", {"ev_020"}),
    ("布局分析模型采用什么架构？", {"ev_022"}),
    ("TableFormer 如何恢复表格结构？", {"ev_024", "ev_025"}),
    ("扫描版 PDF 和图片文字如何处理？", {"ev_009", "ev_026"}),
    ("低资源环境应该选择什么后端，有什么代价？", {"ev_032"}),
    ("Docling 未来计划增加哪些模型？", {"ev_036"}),
    ("论文是否报告了用户满意度调查结果？", set()),
]


def main() -> None:
    load_dotenv()
    retriever = QdrantRetriever.from_env()
    rows = []
    for question, expected in CASES:
        ids = [item.evidence_id for item in retriever.retrieve(question, "docling_tech_report", 3)]
        hit = bool(expected.intersection(ids)) if expected else None
        rows.append({
            "question": question,
            "expected_any": sorted(expected),
            "top3": ids,
            "hit": hit,
        })
        status = "HIT" if hit else "MISS" if hit is False else "UNSCORED"
        print(f"{status:8} {question} -> {', '.join(ids)}")

    scored = [row for row in rows if row["hit"] is not None]
    hits = sum(row["hit"] for row in scored)
    summary = {
        "paper_id": "docling_tech_report",
        "top_k": 3,
        "hits": hits,
        "scored": len(scored),
        "hit_rate": hits / len(scored),
        "cases": rows,
    }
    out = Path("outputs/eval/qdrant_retrieval_eval.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nTop-3 hit rate: {hits}/{len(scored)} ({summary['hit_rate']:.0%})")
    print(f"Report: {out}")
    if summary["hit_rate"] < 0.8:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
