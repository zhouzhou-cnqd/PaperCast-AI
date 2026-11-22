"""schemas 校验规则单测（仅依赖 pydantic，属于代码级测试，非真实实验结论）。"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from papercast_poc.schemas import PodcastScript, Segment


def test_paper_fact_requires_evidence():
    with pytest.raises(ValueError):
        Segment(segment_id="s1", speaker="host", text="问题?", claim_type="paper_fact")


def test_inference_allows_no_evidence():
    seg = Segment(segment_id="s1", speaker="host", text="AI 分析", claim_type="inference")
    assert seg.evidence_ids == []


def test_script_requires_both_speakers():
    segs = [Segment(segment_id="s1", speaker="host", text="a", claim_type="explanation")]
    with pytest.raises(ValueError):
        PodcastScript(paper_id="p1", segments=segs)


def test_valid_script():
    script = PodcastScript(
        paper_id="p1",
        segments=[
            Segment(segment_id="s1", speaker="host", text="a", evidence_ids=["ev_001"]),
            Segment(segment_id="s2", speaker="researcher", text="b", evidence_ids=["ev_001"]),
        ],
    )
    assert len(script.segments) == 2