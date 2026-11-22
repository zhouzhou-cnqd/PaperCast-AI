"""本地功能测试服务：播客数据、音频文件和批量语音转文字问答 API。

仅用标准库 http.server，不引入新依赖（保护手动安装的 CUDA torch 环境）。
复用已验证适配器：faster-whisper ASR + Qdrant/关键词检索 + DeepSeek。
互动只返回文字；Qwen3-TTS 继续用于离线生成播客，不进入问答链路。
本服务仅绑定 127.0.0.1，用于本地功能测试，不是公网部署方案。

运行（必须 --no-sync 或直接用 venv python，避免 uv sync 回退 CPU torch）：
  uv run --no-sync python scripts/serve_local.py --port 8000 [--warmup]
前端：papercast-site 下 npm run dev（vite 已配置 /api 与 /audio 代理到本服务）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv  # noqa: E402

from papercast_poc.asr_adapter import ASRError, FasterWhisperASR  # noqa: E402
from papercast_poc.schemas import Evidence, ParsedPaper  # noqa: E402
from papercast_poc.qdrant_retrieval import QdrantRetriever  # noqa: E402
from papercast_poc.tutor import answer_question  # noqa: E402

MAX_BODY_BYTES = 20 * 1024 * 1024  # 录音上传上限 20MB
MIME = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".webm": "audio/webm", ".ogg": "audio/ogg",
        ".mp4": "audio/mp4", ".m4a": "audio/mp4", ".aac": "audio/aac"}


class State:
    """启动时加载数据产物；模型懒加载，推理串行（单 GPU）。"""

    def __init__(self, pipeline_dir: Path):
        self.pipeline_dir = pipeline_dir
        self.paper = ParsedPaper.model_validate_json(
            (pipeline_dir / "pdf_parse" / "paper.json").read_text(encoding="utf-8"))
        self.pool = [Evidence.model_validate(e) for e in json.loads(
            (pipeline_dir / "evidence_pool.json").read_text(encoding="utf-8"))]
        manifest_path = next((path for path in (
            pipeline_dir / "audio" / "manifest.json",
            pipeline_dir / "tts" / "manifest.json",
        ) if path.is_file()), None)
        if manifest_path is None:
            raise FileNotFoundError(f"未找到播客 manifest：{pipeline_dir}")
        self.audio_dir = manifest_path.parent
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        podcast_file = next((self.audio_dir / name for name in (
            "podcast.mp3", "podcast.wav", "podcast_preview.wav"
        ) if (self.audio_dir / name).is_file()), None)
        if podcast_file is None:
            raise FileNotFoundError(f"未找到播客音频：{self.audio_dir}")

        segments, cursor = [], 0.0
        for m in manifest["segments"]:
            start = m.get("start_seconds", cursor)
            segments.append({
                "segment_id": m["segment_id"], "speaker": m["speaker"],
                "voice": m.get("voice", ""), "text": m["text"],
                "duration_seconds": m["duration_seconds"], "start_seconds": round(start, 2),
                "evidence_ids": m.get("evidence_ids", []), "claim_type": m.get("claim_type", ""),
            })
            cursor = start + m["duration_seconds"]
        self.podcast_payload = {
            "paper_id": manifest.get("paper_id", ""),
            "podcast_url": f"/audio/{self.paper.paper_id}/{podcast_file.name}",
            "total_seconds": manifest.get("total_seconds", round(cursor, 2)),
            "segments": segments,
        }
        self.seg_by_id = {s["segment_id"]: s for s in segments}

        self.web_dir = ROOT / "outputs" / "tutor_web"
        self.web_dir.mkdir(parents=True, exist_ok=True)
        self.audio_dirs = [self.audio_dir, self.web_dir]

        self.asr = FasterWhisperASR(model_dir=str(ROOT / "third_party" / "models" / "faster-whisper-small"))
        self.retriever = QdrantRetriever.from_env() if QdrantRetriever.configured() else None
        self.infer_lock = threading.Lock()
        # 计数器从已有产物初始化，避免服务重启后覆盖历史问答文件
        existing_nums = []
        for p in self.web_dir.glob(f"{self.paper.paper_id}_ask_*"):
            part = p.stem.rsplit("_", 1)[-1]
            if part.isdigit():
                existing_nums.append(int(part))
        self.ask_counter = max(existing_nums, default=0)
        self.counter_lock = threading.Lock()

    def next_ask_id(self) -> int:
        with self.counter_lock:
            self.ask_counter += 1
            return self.ask_counter

    def health(self) -> dict:
        return {
            "ok": True,
            "deepseek_key_set": bool(os.environ.get("DEEPSEEK_API_KEY")),
            "asr_loaded": self.asr._model is not None,
            "qdrant_configured": self.retriever is not None,
            "retrieval_mode": "qdrant_hybrid" if self.retriever else "keyword_fallback",
        }

    def warmup(self) -> None:
        with self.infer_lock:
            t0 = time.perf_counter()
            self.asr._load()
            print(f"[warmup] ASR 加载完成，{time.perf_counter() - t0:.1f}s")

    def ask(self, audio_bytes: bytes, ext: str, segment_id: str | None, position: float) -> dict:
        n = self.next_ask_id()
        prefix = f"{self.paper.paper_id}_ask_{n:03d}"
        q_path = self.web_dir / f"{prefix}{ext}"
        q_path.write_bytes(audio_bytes)
        t0 = time.perf_counter()
        with self.infer_lock:
            transcript = self.asr.transcribe(str(q_path))
            seg = self.seg_by_id.get(segment_id or "")
            answer, report = answer_question(
                self.paper, transcript["text"], self.pool,
                current_segment_text=seg["text"] if seg else None,
                resume_segment_id=segment_id,
                resume_position_seconds=position,
                current_segment_evidence_ids=seg["evidence_ids"] if seg else None,
                retriever=self.retriever,
            )
        result = {
            "transcript": answer.transcript,
            "answer": answer.answer,
            "evidence_ids": answer.evidence_ids,
            "resume_segment_id": answer.resume_segment_id,
            "resume_position_seconds": answer.resume_position_seconds,
            "asr_seconds": transcript.get("asr_seconds"),
            "total_seconds": round(time.perf_counter() - t0, 2),
            "report": {k: report.get(k) for k in ("retrieval_method", "keywords", "retrieved_evidence", "path", "invalid_refs_removed")},
        }
        (self.web_dir / f"{prefix}_result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result


def make_handler(states: dict[str, State], default_paper_id: str):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # 精简访问日志
            print(f"[http] {self.address_string()} {fmt % args}")

        # ---------- 基础工具 ----------
        def _send(self, status: int, body: bytes, content_type: str, extra: dict | None = None):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def _json(self, obj: dict, status: int = 200):
            self._send(status, json.dumps(obj, ensure_ascii=False).encode("utf-8"),
                       "application/json; charset=utf-8")

        def _state(self, parsed):
            paper_id = parse_qs(parsed.query).get("paper_id", [default_paper_id])[0]
            return states.get(paper_id)

        def _serve_audio(self, paper_id: str, name: str):
            state = states.get(paper_id)
            if state is None:
                self._json({"error": f"未知论文：{paper_id}"}, 404)
                return
            safe = Path(name).name  # 防目录穿越
            path = next((d / safe for d in state.audio_dirs if (d / safe).is_file()), None)
            if path is None:
                self._json({"error": f"音频不存在：{safe}"}, 404)
                return
            size = path.stat().st_size
            ctype = MIME.get(path.suffix.lower(), "application/octet-stream")
            rng = self.headers.get("Range", "")
            start, end = 0, size - 1
            partial = False
            if rng.startswith("bytes="):
                try:
                    a, _, b = rng[6:].partition("-")
                    start = int(a) if a else 0
                    end = int(b) if b else size - 1
                    end = min(end, size - 1)
                    partial = 0 <= start <= end
                except ValueError:
                    partial = False
            if rng and not partial:
                self._send(416, b"", ctype, {"Content-Range": f"bytes */{size}"})
                return
            length = end - start + 1
            with path.open("rb") as f:
                f.seek(start)
                data = f.read(length)
            headers = {"Accept-Ranges": "bytes"}
            if partial:
                headers["Content-Range"] = f"bytes {start}-{end}/{size}"
            self._send(206 if partial else 200, data, ctype, headers)

        # ---------- 路由 ----------
        def do_OPTIONS(self):
            self._send(204, b"", "text/plain", {
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            })

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            parsed = urlparse(self.path)
            state = self._state(parsed)
            if parsed.path == "/api/health":
                self._json(state.health() if state else {"error": "unknown paper"}, 200 if state else 404)
            elif parsed.path == "/api/papers":
                self._json({"papers": [
                    {"paper_id": paper_id, "segments": len(item.podcast_payload["segments"]),
                     "total_seconds": item.podcast_payload["total_seconds"]}
                    for paper_id, item in states.items()
                ]})
            elif parsed.path == "/api/podcast":
                self._json(state.podcast_payload if state else {"error": "unknown paper"}, 200 if state else 404)
            elif parsed.path.startswith("/audio/"):
                parts = unquote(parsed.path[len("/audio/"):]).split("/", 1)
                paper_id, name = (parts if len(parts) == 2 else [default_paper_id, parts[0]])
                self._serve_audio(paper_id, name)
            else:
                self._json({"error": "not found", "routes": ["/api/health", "/api/podcast", "/audio/<file>", "POST /api/ask", "POST /api/warmup"]}, 404)

        def do_POST(self):
            parsed = urlparse(self.path)
            state = self._state(parsed)
            if state is None:
                self._json({"error": "unknown paper"}, 404)
                return
            if parsed.path == "/api/warmup":
                threading.Thread(target=state.warmup, daemon=True).start()
                self._json({"started": True, "note": "后台加载 ASR，轮询 /api/health 查看进度"})
                return
            if parsed.path != "/api/ask":
                self._json({"error": "not found"}, 404)
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length <= 0 or length > MAX_BODY_BYTES:
                self._json({"error": f"请求体无效（0 < size <= {MAX_BODY_BYTES}）"}, 400)
                return
            body = self.rfile.read(length)
            qs = parse_qs(parsed.query)
            segment_id = qs.get("segment_id", [None])[0]
            try:
                position = float(qs.get("position", ["0"])[0])
            except ValueError:
                position = 0.0
            ctype = (self.headers.get("Content-Type") or "audio/webm").split(";")[0].strip()
            ext = {".wav": ".wav", "audio/wav": ".wav", "audio/x-wav": ".wav",
                   "audio/ogg": ".ogg", "audio/mp4": ".mp4", "audio/x-m4a": ".mp4",
                   "audio/aac": ".aac", "audio/mpeg": ".mp3"}.get(ctype, ".webm")
            try:
                result = state.ask(body, ext, segment_id, position)
                self._json(result)
            except ASRError as e:
                self._json({"error": f"ASR 失败：{e}", "hint": "可能没听清，请靠近麦克风重试"}, 422)
            except Exception as e:  # noqa: BLE001
                self._json({"error": f"{type(e).__name__}: {e}"}, 500)

    return Handler


def main() -> None:
    load_dotenv(ROOT / ".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--pipeline-dir", action="append")
    ap.add_argument("--warmup", action="store_true", help="启动后立即后台加载 ASR + TTS 模型")
    args = ap.parse_args()

    pipeline_dirs = args.pipeline_dir or [str(ROOT / "outputs" / "pipeline")]
    states = {}
    for pipeline_dir in pipeline_dirs:
        state = State(Path(pipeline_dir))
        states[state.paper.paper_id] = state
    default_paper_id = next(iter(states))
    shared = states[default_paper_id]
    for state in states.values():
        state.asr = shared.asr
        state.retriever = shared.retriever
        state.infer_lock = shared.infer_lock
    if not os.environ.get("DEEPSEEK_API_KEY"):
        print("⚠️ DEEPSEEK_API_KEY 未设置：/api/ask 将在 LLM 边界报错（不静默 Mock）")
    if args.warmup:
        threading.Thread(target=shared.warmup, daemon=True).start()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(states, default_paper_id))
    print(f"PaperCast 本地测试服务已启动：http://127.0.0.1:{args.port}")
    print(f"  论文：{', '.join(states)}")
    print(f"  检索：{'Qdrant hybrid' if shared.retriever else '关键词回退（未配置 Qdrant）'}")
    print(f"  前端：在 papercast-site 下 npm run dev，浏览器打开 vite 给出的地址")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("已停止")


if __name__ == "__main__":
    main()
