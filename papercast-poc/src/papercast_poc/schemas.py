"""统一数据模型：解析块 / 证据 / 播客脚本 / 音频清单 / 导师回答。"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

BlockKind = Literal["text", "heading", "table", "formula", "caption", "other"]
Speaker = Literal["host", "researcher"]
ClaimType = Literal["paper_fact", "explanation", "inference"]


class TextBlock(BaseModel):
    """PDF 解析出的一个文本块，带页码溯源。"""

    block_id: str
    paper_id: str
    page: Optional[int] = None          # 1-based；None 表示解析器未给出，需人工/回退补
    section: Optional[str] = None       # 最近上级章节标题
    text: str
    kind: BlockKind = "text"


class ParsedPaper(BaseModel):
    paper_id: str
    source: str                          # 原始 PDF 路径或 URL
    num_pages: int
    parser: str = "docling"
    blocks: list[TextBlock] = Field(default_factory=list)


class Evidence(BaseModel):
    evidence_id: str
    block_id: str
    page: Optional[int] = None
    section: Optional[str] = None
    quote: str


class Segment(BaseModel):
    segment_id: str
    speaker: Speaker
    text: str
    evidence_ids: list[str] = Field(default_factory=list)
    claim_type: ClaimType = "paper_fact"

    @model_validator(mode="after")
    def fact_needs_evidence(self) -> "Segment":
        if self.claim_type == "paper_fact" and not self.evidence_ids:
            raise ValueError(f"{self.segment_id}: paper_fact 必须绑定至少一条证据")
        return self


class PodcastScript(BaseModel):
    paper_id: str
    segments: list[Segment]

    @model_validator(mode="after")
    def both_speakers_present(self) -> "PodcastScript":
        speakers = {s.speaker for s in self.segments}
        if speakers != {"host", "researcher"}:
            raise ValueError("双角色脚本必须同时包含 host 与 researcher")
        return self


class AudioManifestItem(BaseModel):
    segment_id: str
    speaker: Speaker
    text: str
    audio_path: str
    duration_seconds: float
    evidence_ids: list[str] = Field(default_factory=list)


class TutorAnswer(BaseModel):
    transcript: str
    answer: str
    evidence_ids: list[str] = Field(default_factory=list)
    audio_path: Optional[str] = None
    resume_segment_id: Optional[str] = None
    resume_position_seconds: float = 0.0