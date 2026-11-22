import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from papercast_poc.qdrant_retrieval import DENSE_MODEL, QdrantRetriever
from papercast_poc.schemas import Evidence


class _Response:
    status_code = 200

    def raise_for_status(self):
        pass

    def json(self):
        return {
            "result": {"points": [{
                "payload": {
                    "paper_id": "p1", "evidence_id": "ev_001", "block_id": "b1",
                    "page": 3, "section": "Method", "quote": "Original paper text",
                }
            }]}
        }


class _Session:
    def __init__(self):
        self.calls = []

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return _Response()


def test_hybrid_query_filters_paper_and_returns_original_evidence():
    session = _Session()
    result = QdrantRetriever("https://example.qdrant.io", "secret", session=session).retrieve(
        "核心方法是什么", "p1"
    )
    body = session.calls[0][2]["json"]
    assert body["prefetch"][0]["query"]["model"] == DENSE_MODEL
    assert "core" in body["prefetch"][0]["query"]["text"]
    assert "method" in body["prefetch"][0]["query"]["text"]
    assert body["prefetch"][0]["filter"]["must"][0]["match"]["value"] == "p1"
    assert body["prefetch"][0]["filter"]["must_not"][0]["key"] == "is_appendix"
    assert body["query"] == {"fusion": "rrf"}
    assert result[0].evidence_id == "ev_001"
    assert result[0].quote == "Original paper text"


def test_index_marks_everything_after_appendix():
    session = _Session()
    retriever = QdrantRetriever("https://example.qdrant.io", "secret", session=session)
    retriever.ensure_collection = lambda: None
    retriever.index("p1", [
        Evidence(evidence_id="ev_001", block_id="b1", page=1, section="Method", quote="Main body text"),
        Evidence(evidence_id="ev_002", block_id="b2", page=2, section="Appendix", quote="Appendix intro"),
        Evidence(evidence_id="ev_003", block_id="b3", page=2, section="Extra results", quote="Appendix detail"),
    ])
    points = session.calls[-1][2]["json"]["points"]
    assert [point["payload"]["is_appendix"] for point in points] == [False, True, True]


def test_explicit_appendix_question_includes_appendix():
    session = _Session()
    QdrantRetriever("https://example.qdrant.io", "secret", session=session).retrieve(
        "附录里还有哪些实验？", "p1"
    )
    body = session.calls[0][2]["json"]
    excluded = {item["key"] for item in body["prefetch"][0]["filter"]["must_not"]}
    assert "is_appendix" not in excluded
    assert "is_reference" in excluded
