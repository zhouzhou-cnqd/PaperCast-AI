"""Qdrant Cloud hybrid retrieval over PaperCast evidence.

Uses Qdrant's HTTP API directly so the same request shape works from the
local Python service and a later Qoder Sites Worker without another SDK.
"""
from __future__ import annotations

import os
import time
import uuid

import requests

from .schemas import Evidence

DENSE_MODEL = "intfloat/multilingual-e5-small"
COLLECTION = "papercast_evidence"
APPENDIX_MARKERS = ("appendix", "supplementary", "supplemental", "附录", "补充材料")
REFERENCE_MARKERS = ("references", "bibliography", "参考文献", "引用")


class QdrantError(RuntimeError):
    pass


class QdrantRetriever:
    def __init__(
        self,
        url: str,
        api_key: str,
        collection: str = COLLECTION,
        session=None,
    ):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.collection = collection
        self.session = session or requests.Session()
        self.proxy = os.getenv("QDRANT_PROXY", "").strip()

    @classmethod
    def configured(cls) -> bool:
        return bool(os.getenv("QDRANT_URL") and os.getenv("QDRANT_API_KEY"))

    @classmethod
    def from_env(cls) -> "QdrantRetriever":
        url = os.getenv("QDRANT_URL", "").strip()
        api_key = os.getenv("QDRANT_API_KEY", "").strip()
        if not url or not api_key:
            raise QdrantError("QDRANT_URL 和 QDRANT_API_KEY 尚未配置")
        return cls(url, api_key, os.getenv("QDRANT_COLLECTION", COLLECTION))

    def _request(self, method: str, path: str, payload: dict | None = None, allow_404: bool = False):
        response = None
        for attempt in range(3):
            try:
                kwargs = {
                    "headers": {"api-key": self.api_key, "Content-Type": "application/json"},
                    "json": payload,
                    "timeout": 30,
                }
                if self.proxy:
                    kwargs["proxies"] = {"http": self.proxy, "https": self.proxy}
                response = self.session.request(method, f"{self.url}{path}", **kwargs)
                break
            except requests.RequestException as exc:
                if attempt == 2:
                    raise QdrantError(f"Qdrant {method} {path} 网络连接失败") from exc
                time.sleep(0.5 * (attempt + 1))
        assert response is not None
        if allow_404 and response.status_code == 404:
            return None
        try:
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            raise QdrantError(f"Qdrant {method} {path} 失败（HTTP {response.status_code}）") from exc

    def ensure_collection(self) -> None:
        path = f"/collections/{self.collection}"
        info = self._request("GET", path, allow_404=True)
        if info is None:
            self._request("PUT", path, {
                "vectors": {"dense_vector": {"size": 384, "distance": "Cosine"}}
            })
        payload_schema = (info or {}).get("result", {}).get("payload_schema", {})
        indexes = {
            "passage_text": {"type": "text", "scoring": True},
            "paper_id": "keyword",
            "is_appendix": "bool",
            "is_reference": "bool",
        }
        for field_name, field_schema in indexes.items():
            if field_name not in payload_schema:
                self._request("PUT", f"{path}/index?wait=true", {
                    "field_name": field_name,
                    "field_schema": field_schema,
                })

    def index(self, paper_id: str, evidences: list[Evidence], batch_size: int = 32) -> int:
        self.ensure_collection()
        self._request(
            "POST",
            f"/collections/{self.collection}/points/delete?wait=true",
            {"filter": {"must": [{"key": "paper_id", "match": {"value": paper_id}}]}},
        )
        points = []
        in_appendix = False
        in_references = False
        for evidence in evidences:
            if not evidence.quote.strip():
                continue
            section = (evidence.section or "").strip().lower()
            if any(section == marker or section.startswith(f"{marker} ") for marker in APPENDIX_MARKERS):
                in_appendix = True
                in_references = False
            elif any(section == marker or section.startswith(f"{marker} ") for marker in REFERENCE_MARKERS):
                in_references = True
            points.append({
                "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"papercast:{paper_id}:{evidence.evidence_id}")),
                "vector": {
                    "dense_vector": {"text": evidence.quote, "model": DENSE_MODEL}
                },
                "payload": {
                    "paper_id": paper_id,
                    "evidence_id": evidence.evidence_id,
                    "block_id": evidence.block_id,
                    "page": evidence.page,
                    "section": evidence.section,
                    "quote": evidence.quote,
                    "passage_text": evidence.quote,
                    "is_appendix": in_appendix,
                    "is_reference": in_references,
                },
            })
        for start in range(0, len(points), batch_size):
            self._request(
                "PUT",
                f"/collections/{self.collection}/points?wait=true",
                {"points": points[start:start + batch_size]},
            )
        return len(points)

    def retrieve(self, question: str, paper_id: str, limit: int = 5) -> list[Evidence]:
        query_text = question
        if any("\u4e00" <= char <= "\u9fff" for char in question):
            from .tutor import extract_keywords

            keywords = extract_keywords(question)
            if keywords:
                query_text = f"{question} {' '.join(keywords)}"
        paper_filter = {
            "must": [{"key": "paper_id", "match": {"value": paper_id}}]
        }
        if not any(marker in question.lower() for marker in APPENDIX_MARKERS):
            paper_filter.setdefault("must_not", []).append(
                {"key": "is_appendix", "match": {"value": True}}
            )
        if not any(marker in question.lower() for marker in REFERENCE_MARKERS):
            paper_filter.setdefault("must_not", []).append(
                {"key": "is_reference", "match": {"value": True}}
            )
        body = {
            "prefetch": [
                {
                    "query": {"text": query_text, "model": DENSE_MODEL},
                    "using": "dense_vector",
                    "filter": paper_filter,
                    "limit": max(limit * 2, 10),
                },
                {
                    "query": {"text": query_text},
                    "using": "passage_text",
                    "filter": paper_filter,
                    "limit": max(limit * 2, 10),
                },
            ],
            "query": {"fusion": "rrf"},
            "limit": limit,
            "with_payload": True,
        }
        data = self._request(
            "POST", f"/collections/{self.collection}/points/query", body
        )
        result = data.get("result", {})
        points = result.get("points", result if isinstance(result, list) else [])
        evidences = []
        for point in points:
            payload = point.get("payload") or {}
            quote = str(payload.get("quote") or payload.get("passage_text") or "").strip()
            evidence_id = str(payload.get("evidence_id") or "").strip()
            if quote and evidence_id:
                evidences.append(Evidence(
                    evidence_id=evidence_id,
                    block_id=str(payload.get("block_id") or evidence_id),
                    page=payload.get("page"),
                    section=payload.get("section"),
                    quote=quote,
                ))
        return evidences
