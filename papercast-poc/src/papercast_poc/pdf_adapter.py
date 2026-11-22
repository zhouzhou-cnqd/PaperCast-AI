"""实验 A：Docling PDF 解析适配器，保留页码/章节/表格，PyMuPDF 回退补页码。"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from .schemas import ParsedPaper, TextBlock


def parse_pdf(pdf_path: str | Path, paper_id: str, out_dir: str | Path) -> tuple[ParsedPaper, dict]:
    """解析真实 PDF，写出 paper.json / paper.md，返回 (结构化论文, 运行统计)。"""
    # Windows 非管理员无符号链接特权（WinError 1314），让 HF 缓存改用文件复制
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    from docling.document_converter import DocumentConverter

    pdf_path = Path(pdf_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.perf_counter()
    converter = DocumentConverter()
    result = converter.convert(str(pdf_path))
    elapsed = time.perf_counter() - t0
    doc = result.document

    blocks: list[TextBlock] = []
    current_section: str | None = None

    # doc.texts 含正文/标题/公式等，按阅读顺序排列
    for item in doc.texts:
        label = getattr(item, "label", None)
        label_val = getattr(label, "value", str(label))
        text = getattr(item, "text", "") or ""
        if not text.strip():
            continue
        page = item.prov[0].page_no if getattr(item, "prov", None) else None
        if label_val in ("section_header", "title"):
            kind = "heading"
            current_section = text.strip()
        elif label_val == "formula":
            kind = "formula"
        elif label_val in ("caption",):
            kind = "caption"
        else:
            kind = "text"
        blocks.append(
            TextBlock(
                block_id=f"blk_{len(blocks) + 1:04d}",
                paper_id=paper_id,
                page=page,
                section=current_section,
                text=text.strip(),
                kind=kind,
            )
        )

    # 表格单独导出为 Markdown，保留结构
    for table in getattr(doc, "tables", []):
        try:
            md = table.export_to_markdown(doc)
        except TypeError:
            md = table.export_to_markdown()
        page = table.prov[0].page_no if getattr(table, "prov", None) else None
        blocks.append(
            TextBlock(
                block_id=f"blk_{len(blocks) + 1:04d}",
                paper_id=paper_id,
                page=page,
                section=current_section,
                text=md,
                kind="table",
            )
        )

    num_pages = len(getattr(doc, "pages", {}) or {})
    missing_pages = sum(1 for b in blocks if b.page is None)

    # PyMuPDF 回退：对缺页码的块，用文本前缀在各页中搜索定位
    if missing_pages:
        import fitz  # PyMuPDF

        with fitz.open(pdf_path) as pdf:
            page_texts = [p.get_text() for p in pdf]
        for blk in blocks:
            if blk.page is not None:
                continue
            probe = " ".join(blk.text.split())[:60]
            if len(probe) < 20:
                continue
            for pno, pt in enumerate(page_texts, start=1):
                if probe in " ".join(pt.split()):
                    blk.page = pno
                    break
        if not num_pages:
            num_pages = len(page_texts)

    paper = ParsedPaper(
        paper_id=paper_id,
        source=str(pdf_path),
        num_pages=num_pages,
        parser="docling+pymupdf_fallback" if missing_pages else "docling",
        blocks=blocks,
    )

    (out_dir / "paper.json").write_text(paper.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "paper.md").write_text(doc.export_to_markdown(), encoding="utf-8")

    stats = {
        "parse_seconds": round(elapsed, 2),
        "num_pages": num_pages,
        "num_blocks": len(blocks),
        "total_text_chars": sum(len(b.text) for b in blocks),
        "blocks_missing_page_before_fallback": missing_pages,
        "blocks_missing_page_after_fallback": sum(1 for b in blocks if b.page is None),
        "num_tables": len(getattr(doc, "tables", [])),
        "docling_status": str(getattr(result, "status", "unknown")),
    }
    (out_dir / "parse_stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return paper, stats