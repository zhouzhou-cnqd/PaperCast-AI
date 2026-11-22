"""证据存在性校验单测（代码级测试，使用构造数据，明确非真实论文结论）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from papercast_poc.evidence import build_evidence, validate_script_evidence
from papercast_poc.schemas import ParsedPaper, PodcastScript, Segment, TextBlock


def _paper() -> ParsedPaper:
    return ParsedPaper(
        paper_id="p1",
        source="synthetic_for_unit_test",
        num_pages=2,
        blocks=[
            TextBlock(block_id="b1", paper_id="p1", page=1, text="Introduction", kind="heading"),
            TextBlock(block_id="b2", paper_id="p1", page=1, text="x" * 80, kind="text"),
            TextBlock(block_id="b3", paper_id="p1", page=2, text="short", kind="text"),
        ],
    )


def test_build_evidence_skips_headings_and_short():
    evs = build_evidence(_paper())
    assert len(evs) == 1
    assert evs[0].block_id == "b2" and evs[0].page == 1


def test_build_evidence_skips_repeated_cross_page_headers():
    header = "WANG et al.: DIFFUSION BRIDGE-BASED GDA FOR FAULT DIAGNOSIS"
    paper = ParsedPaper(
        paper_id="p2", source="synthetic", num_pages=2,
        blocks=[
            TextBlock(block_id="h1", paper_id="p2", page=1, text=header),
            TextBlock(block_id="t1", paper_id="p2", page=1, text="A" * 80),
            TextBlock(block_id="h2", paper_id="p2", page=2, text=header),
            TextBlock(block_id="t2", paper_id="p2", page=2, text="B" * 80),
        ],
    )
    assert [item.block_id for item in build_evidence(paper)] == ["t1", "t2"]


def test_missing_reference_detected():
    evs = build_evidence(_paper())
    script = PodcastScript(
        paper_id="p1",
        segments=[
            Segment(segment_id="s1", speaker="host", text="a", evidence_ids=["ev_999"]),
            Segment(segment_id="s2", speaker="researcher", text="b", claim_type="explanation"),
        ],
    )
    report = validate_script_evidence(script, evs)
    assert not report["ok"]
    assert report["missing_evidence_refs"] == [{"segment_id": "s1", "evidence_id": "ev_999"}]


def test_valid_reference_passes():
    evs = build_evidence(_paper())
    script = PodcastScript(
        paper_id="p1",
        segments=[
            Segment(segment_id="s1", speaker="host", text="a", evidence_ids=[evs[0].evidence_id]),
            Segment(segment_id="s2", speaker="researcher", text="b", claim_type="explanation"),
        ],
    )
    assert validate_script_evidence(script, evs)["ok"]
