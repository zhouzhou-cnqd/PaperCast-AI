"""实验 B 运行入口：paper.json → 证据池 → LLM 生成脚本 → 代码校验 → outputs/podcast/。

前置条件：.env 中已配置 DEEPSEEK_API_KEY（未设置会显式报错，绝不静默 Mock）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv  # noqa: E402

from papercast_poc.evidence import build_evidence  # noqa: E402
from papercast_poc.podcast_adapter import generate_script  # noqa: E402
from papercast_poc.schemas import ParsedPaper  # noqa: E402


def main() -> None:
    load_dotenv(ROOT / ".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--paper-json", default=str(ROOT / "outputs" / "pdf_parse" / "paper.json"))
    ap.add_argument("--out-dir", default=str(ROOT / "outputs" / "podcast"))
    ap.add_argument("--max-evidence", type=int, default=40)
    args = ap.parse_args()

    paper = ParsedPaper.model_validate_json(Path(args.paper_json).read_text(encoding="utf-8"))
    evidences = build_evidence(paper)
    print(f"evidence pool: {len(evidences)} items")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "evidence_pool.json").write_text(
        json.dumps([e.model_dump() for e in evidences], indent=2, ensure_ascii=False), encoding="utf-8"
    )

    script, run_report = generate_script(paper.paper_id, evidences, max_retries=1)
    (out_dir / "script.json").write_text(script.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "generation_report.json").write_text(
        json.dumps(run_report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    log = ROOT / "reports" / "experiment_log.md"
    entry = (
        f"\n## 实验 B — {datetime.now().isoformat(timespec='seconds')}【已实际运行】\n\n"
        f"- 命令：`uv run python scripts/experiment_podcast.py`\n"
        f"- 证据池：{len(evidences)} 条；segments：{len(script.segments)}\n"
        f"- 代码校验：{json.dumps(run_report['attempts'][-1], ensure_ascii=False)}\n"
        f"- LLM 用量：{json.dumps(run_report.get('llm_usage', []), ensure_ascii=False)}\n"
        f"- 待办：人工抽检 ≥5 个 paper_fact 段的语义支持度（对照 evidence_pool.json 原文）。\n"
    )
    with log.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(f"segments={len(script.segments)}, outputs -> {out_dir}")


if __name__ == "__main__":
    main()
