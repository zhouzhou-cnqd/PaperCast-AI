"""DBDA 演示内容覆盖：摘要、实验、局限/未来工作与英文提问。"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from papercast_poc.qdrant_retrieval import QdrantRetriever  # noqa: E402
from papercast_poc.schemas import Evidence, ParsedPaper  # noqa: E402
from papercast_poc.tutor import answer_question  # noqa: E402

CASES = [
    ("summary", "请用一句话概括这篇论文研究的主要问题和方法。"),
    ("results", "实验结果如何，DBDA 相比基线表现怎样？"),
    ("limitations", "论文明确提到了哪些局限性或未来工作？"),
    ("english", "What are the three main components of DBDA?"),
]


def main() -> None:
    load_dotenv(ROOT / ".env")
    pdir = ROOT / "outputs" / "papers" / "diffusion_bridge_gda_fault_diagnosis"
    paper = ParsedPaper.model_validate_json((pdir / "pdf_parse" / "paper.json").read_text(encoding="utf-8"))
    pool = [Evidence.model_validate(item) for item in json.loads(
        (pdir / "evidence_pool.json").read_text(encoding="utf-8"))]
    retriever = QdrantRetriever.from_env()
    rows = []
    for tag, question in CASES:
        started = time.perf_counter()
        answer, report = answer_question(paper, question, pool, retriever=retriever)
        rows.append({
            "case": tag,
            "question": question,
            "answer": answer.answer,
            "seconds": round(time.perf_counter() - started, 2),
            "retrieval": report.get("retrieval_method"),
            "path": report.get("path"),
        })
    out = ROOT / "outputs" / "eval" / "content_question_eval.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(rows, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
