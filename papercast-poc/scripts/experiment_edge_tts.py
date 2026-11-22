"""Generate compact showcase audio with Microsoft Edge neural voices.

This is a deployment-oriented alternative to the local Qwen experiment: the
result is still pre-generated audio, so the public site needs no TTS service.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import soundfile as sf


VOICES = {"host": "zh-CN-XiaoxiaoNeural", "researcher": "zh-CN-YunxiNeural"}


async def synthesize(script_path: Path, out_dir: Path, limit: int) -> None:
    script = json.loads(script_path.read_text(encoding="utf-8"))
    segments = script["segments"][:limit]
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest_segments = []
    audio_paths: list[Path] = []
    cursor = 0.0
    for segment in segments:
        speaker = segment["speaker"]
        audio_path = out_dir / f'{segment["segment_id"]}_{speaker}.mp3'
        if not audio_path.is_file() or audio_path.stat().st_size == 0:
            await edge_tts.Communicate(segment["text"], VOICES[speaker]).save(str(audio_path))
        duration = round(sf.info(audio_path).duration, 2)
        manifest_segments.append(
            {
                "segment_id": segment["segment_id"],
                "speaker": speaker,
                "voice": VOICES[speaker],
                "text": segment["text"],
                "audio_path": str(audio_path.resolve()),
                "duration_seconds": duration,
                "start_seconds": round(cursor, 2),
                "evidence_ids": segment.get("evidence_ids", []),
                "claim_type": segment.get("claim_type", ""),
            }
        )
        cursor += duration
        audio_paths.append(audio_path)

    final_path = out_dir / "podcast.mp3"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [ffmpeg, "-y"]
    for audio_path in audio_paths:
        command.extend(["-i", str(audio_path)])
    joined = "".join(f"[{index}:a]" for index in range(len(audio_paths)))
    command.extend(
        [
            "-filter_complex",
            f"{joined}concat=n={len(audio_paths)}:v=0:a=1[out]",
            "-map",
            "[out]",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "96k",
            str(final_path),
        ]
    )
    subprocess.run(command, check=True, capture_output=True)
    total_seconds = round(sf.info(final_path).duration, 2)
    manifest = {
        "paper_id": script["paper_id"],
        "mode": "edge-neural-precomputed",
        "gap_seconds": 0,
        "total_seconds": total_seconds,
        "segments": manifest_segments,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "tts_report.json").write_text(
        json.dumps(
            {
                "mode": manifest["mode"],
                "voices": VOICES,
                "segments": len(manifest_segments),
                "final_file": str(final_path.resolve()),
                "total_seconds": total_seconds,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f'{script["paper_id"]}: {len(manifest_segments)} segments, {total_seconds:.1f}s')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script-json", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--segments", type=int, default=6)
    args = parser.parse_args()
    asyncio.run(synthesize(Path(args.script_json), Path(args.out_dir), args.segments))


if __name__ == "__main__":
    main()
