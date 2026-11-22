"""实验 C 运行入口：script.json 前 N 段 → 双音色合成 → 拼接 → outputs/tts/。

默认使用 Qwen3-TTS CustomVoice（首次运行下载权重，需用户已确认）。
--mock 仅用于流水线联调，产物与日志会强制标注『仅 Mock，TTS 实验未通过』。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from papercast_poc.audio_utils import audio_duration, concat_wavs  # noqa: E402
from papercast_poc.schemas import PodcastScript  # noqa: E402
from papercast_poc.tts_adapter import Qwen3TTSProvider, SilentMockTTS  # noqa: E402

DEFAULT_VOICES = {"host": "Vivian", "researcher": "Ryan"}  # 具体音色 ID 以官方模型卡为准，运行前核验
GAP_SECONDS = 0.3


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--script-json", default=str(ROOT / "outputs" / "podcast" / "script.json"))
    ap.add_argument("--out-dir", default=str(ROOT / "outputs" / "tts"))
    ap.add_argument("--segments", type=int, default=6, help="合成前 N 段（任务书要求 ≥6 段双角色）")
    ap.add_argument("--mock", action="store_true", help="静音 Mock，仅联调，不算实验通过")
    ap.add_argument("--host-voice", default=DEFAULT_VOICES["host"])
    ap.add_argument("--researcher-voice", default=DEFAULT_VOICES["researcher"])
    ap.add_argument("--model-dir", default=None, help="本地权重目录（可选）")
    args = ap.parse_args()

    script = PodcastScript.model_validate_json(Path(args.script_json).read_text(encoding="utf-8"))
    segments = script.segments[: args.segments]
    voices = {"host": args.host_voice, "researcher": args.researcher_voice}
    provider = SilentMockTTS() if args.mock else Qwen3TTSProvider(local_dir=args.model_dir)

    tag = "mock_" if args.mock else ""
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    manifest_segments = []
    wav_paths = []
    cursor = 0.0
    for index, seg in enumerate(segments):
        wav = out_dir / f"{tag}{seg.segment_id}_{seg.speaker}.wav"
        path = str(wav) if wav.is_file() and audio_duration(wav) > 0 else provider.synthesize(
            seg.text, voices[seg.speaker], str(wav)
        )
        dur = audio_duration(path)
        results.append({"segment_id": seg.segment_id, "speaker": seg.speaker,
                        "voice": voices[seg.speaker], "file": str(wav), "seconds": round(dur, 2)})
        manifest_segments.append({
            "segment_id": seg.segment_id,
            "speaker": seg.speaker,
            "voice": voices[seg.speaker],
            "text": seg.text,
            "audio_path": str(wav.resolve()),
            "duration_seconds": round(dur, 2),
            "start_seconds": round(cursor, 2),
            "evidence_ids": seg.evidence_ids,
            "claim_type": seg.claim_type,
        })
        cursor += dur + (GAP_SECONDS if index < len(segments) - 1 else 0)
        wav_paths.append(path)

    final = concat_wavs(wav_paths, out_dir / f"{tag}podcast.wav")
    total = audio_duration(final)
    report = {
        "mode": "MOCK_ONLY_TTS_NOT_PASSED" if args.mock else "qwen3-tts",
        "segments": results,
        "final_file": str(final),
        "total_seconds": round(total, 2),
    }
    (out_dir / f"{tag}tts_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    (out_dir / f"{tag}manifest.json").write_text(json.dumps({
        "paper_id": script.paper_id,
        "mode": "mock" if args.mock else "real",
        "gap_seconds": GAP_SECONDS,
        "total_seconds": round(total, 2),
        "segments": manifest_segments,
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    log = ROOT / "reports" / "experiment_log.md"
    label = "【仅 Mock，TTS 实验未通过】" if args.mock else "【已实际运行】"
    entry = (
        f"\n## 实验 C — {datetime.now().isoformat(timespec='seconds')}{label}\n\n"
        f"- 命令：`uv run python scripts/experiment_tts.py{' --mock' if args.mock else ''}`\n"
        f"- 音色：{json.dumps(voices, ensure_ascii=False)}；段数：{len(results)}；总时长：{total:.1f}s\n"
        f"- 明细见 outputs/tts/{tag}tts_report.json；待办：人工试听音色区分度/中文发音/停顿。\n"
    )
    with log.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
