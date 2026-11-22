"""实验 A 运行入口：解析真实 PDF → outputs/pdf_parse/ + 追加实验日志。"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from papercast_poc.pdf_adapter import parse_pdf  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", help="真实、可合法使用的 PDF 路径")
    ap.add_argument("--paper-id", default="paper_001")
    ap.add_argument("--out-dir", default=str(ROOT / "outputs" / "pdf_parse"))
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    paper, stats = parse_pdf(args.pdf, args.paper_id, out_dir)

    log = ROOT / "reports" / "experiment_log.md"
    log.parent.mkdir(parents=True, exist_ok=True)
    entry = (
        f"\n## 实验 A — {datetime.now().isoformat(timespec='seconds')}\n\n"
        f"- 命令：`uv run python scripts/experiment_pdf.py {args.pdf} --paper-id {args.paper_id}`\n"
        f"- 输入：{args.pdf}\n- 统计（实测）：\n\n```json\n{json.dumps(stats, indent=2, ensure_ascii=False)}\n```\n"
        f"- 待办：人工抽检 ≥10 个文本块的页码/阅读顺序/章节归属，并记录于此。\n"
    )
    with log.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    print(f"blocks={len(paper.blocks)}, outputs -> {out_dir}")


if __name__ == "__main__":
    main()
