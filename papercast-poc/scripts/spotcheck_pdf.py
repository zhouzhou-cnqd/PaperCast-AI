"""实验 A 抽检：从 paper.json 均匀抽取 ≥10 个文本块，用 PyMuPDF 原文交叉验证页码归属。

输出 reports/pdf_spotcheck.md，供人工复核阅读顺序与章节归属。
注意：本脚本只做『文本确实出现在所标页』的机器校验，阅读顺序/章节语义仍需人工确认。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))


def norm(s: str) -> str:
    return " ".join(s.split()).lower()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=str(ROOT / "inputs" / "2408.09869.pdf"))
    ap.add_argument("--paper-json", default=str(ROOT / "outputs" / "pdf_parse" / "paper.json"))
    ap.add_argument("--n", type=int, default=12)
    args = ap.parse_args()

    import pymupdf

    paper = json.loads(Path(args.paper_json).read_text(encoding="utf-8"))
    blocks = paper["blocks"]
    with pymupdf.open(args.pdf) as pdf:
        page_texts = [norm(p.get_text()) for p in pdf]

    n = min(args.n, len(blocks))
    step = max(1, len(blocks) // n)
    picked = blocks[::step][:n]
    # 确保覆盖表格/公式（若存在且未被抽到）
    for kind in ("table", "formula"):
        if not any(b["kind"] == kind for b in picked):
            extra = next((b for b in blocks if b["kind"] == kind), None)
            if extra:
                picked.append(extra)

    rows = []
    ok_count = 0
    for b in picked:
        page = b.get("page")
        probe = norm(b["text"])[:80]
        if b["kind"] == "table":
            # 表格是 Markdown 重构，取首个单元格词做弱校验
            words = [w for w in probe.replace("|", " ").split() if len(w) > 3]
            probe = words[0] if words else probe
        found = page is not None and 1 <= page <= len(page_texts) and probe in page_texts[page - 1]
        # 若不在所标页，查它实际出现在哪页
        actual = [i + 1 for i, pt in enumerate(page_texts) if probe and probe in pt]
        status = "PASS" if found else ("PAGE_MISMATCH" if actual else "NOT_FOUND(需人工看，可能是公式/表格重构)")
        ok_count += found
        rows.append((b["block_id"], b["kind"], page, actual[:3], status, b["text"][:90].replace("\n", " "), b.get("section")))

    lines = [
        "# 实验 A 抽检报告（机器交叉校验 + 待人工复核）",
        "",
        f"- PDF: `{args.pdf}`（{len(page_texts)} 页）",
        f"- 抽检块数: {len(picked)} / 总块数 {len(blocks)}",
        f"- 页码文本命中: {ok_count}/{len(picked)}",
        "- 说明：PASS=块文本前缀确实出现在所标页的 PyMuPDF 原文中；表格/公式因结构重构可能 NOT_FOUND，需人工对照 PDF。",
        "",
        "| block_id | kind | 标注页 | 实际命中页 | 结果 | 章节 | 文本预览 |",
        "|---|---|---|---|---|---|---|",
    ]
    for bid, kind, page, actual, status, preview, section in rows:
        preview = preview.replace("|", "\\|")
        section = (section or "-").replace("|", "\\|")[:40]
        lines.append(f"| {bid} | {kind} | {page} | {actual} | {status} | {section} | {preview} |")
    lines += ["", "## 人工复核结论（由实验执行者填写）", "", "- 阅读顺序：待填写", "- 章节归属：待填写", "- 公式/表格保真：待填写"]

    out = ROOT / "reports" / "pdf_spotcheck.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"spotcheck: {ok_count}/{len(picked)} page-hit, report -> {out}")
    for r in rows:
        print(r[0], r[1], "page=", r[2], r[4])


if __name__ == "__main__":
    main()