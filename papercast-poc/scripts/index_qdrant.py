"""将现有 PaperCast 证据池写入 Qdrant Cloud。"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv  # noqa: E402

from papercast_poc.evidence import build_evidence  # noqa: E402
from papercast_poc.qdrant_retrieval import QdrantRetriever  # noqa: E402
from papercast_poc.schemas import Evidence, ParsedPaper  # noqa: E402


def main() -> None:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--pipeline-dir", default=str(ROOT / "outputs" / "pipeline"))
    parser.add_argument("--rebuild-evidence", action="store_true")
    args = parser.parse_args()

    pipeline_dir = Path(args.pipeline_dir)
    paper_path = pipeline_dir / "pdf_parse" / "paper.json"
    paper = ParsedPaper.model_validate_json(paper_path.read_text(encoding="utf-8"))
    pool_path = pipeline_dir / "evidence_pool.json"
    if pool_path.exists() and not args.rebuild_evidence:
        pool = [
            Evidence.model_validate(item)
            for item in json.loads(pool_path.read_text(encoding="utf-8"))
        ]
    else:
        pool = build_evidence(paper)
        pool_path.write_text(
            json.dumps([item.model_dump() for item in pool], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    count = QdrantRetriever.from_env().index(paper.paper_id, pool)
    print(f"Qdrant 索引完成：paper_id={paper.paper_id}，evidence={count}")


if __name__ == "__main__":
    main()
