"""实验 E 运行入口：文件驱动的语音导师最小闭环（非浏览器交互，如实标注）。

录音文件 → faster-whisper ASR → 读取播放上下文 → 检索论文证据 → DeepSeek 回答
→ Qwen3-TTS 导师音频 → 输出 transcript/answer/evidence_ids/audio_path/resume_*。

输入音频：--audio 传用户本人录音；缺省时用 Qwen3-TTS 合成提问音频
（Apache-2.0 授权模型的预设音色，明确标注为合成输入，非真人录音）。
运行两个用例：可回答问题 + 论文未提供问题（验证不编造）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv  # noqa: E402

from papercast_poc.asr_adapter import FasterWhisperASR  # noqa: E402
from papercast_poc.schemas import Evidence, ParsedPaper, PodcastScript  # noqa: E402
from papercast_poc.tts_adapter import Qwen3TTSProvider  # noqa: E402
from papercast_poc.tutor import answer_question  # noqa: E402

QUESTIONS = [
    ("q1_answerable", "Docling 的表格结构识别用的是什么模型？"),
    ("q2_unanswerable", "作者在论文里致谢了哪些家庭成员？"),
]


def main() -> None:
    load_dotenv(ROOT / ".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir", default=str(ROOT / "outputs" / "pipeline"))
    ap.add_argument("--audio", default=None, help="用户本人录音（用于 q1）；缺省合成提问音频")
    ap.add_argument("--asr-model", default=str(ROOT / "third_party" / "models" / "faster-whisper-small"))
    ap.add_argument("--tts-model", default=str(ROOT / "third_party" / "models" / "Qwen3-TTS-12Hz-0.6B-CustomVoice"))
    args = ap.parse_args()

    pdir = Path(args.pipeline_dir)
    paper = ParsedPaper.model_validate_json((pdir / "pdf_parse" / "paper.json").read_text(encoding="utf-8"))
    pool = [Evidence.model_validate(e) for e in json.loads((pdir / "evidence_pool.json").read_text(encoding="utf-8"))]
    script = PodcastScript.model_validate_json((pdir / "script.json").read_text(encoding="utf-8"))
    manifest = json.loads((pdir / "audio" / "manifest.json").read_text(encoding="utf-8"))["segments"]

    # 播放上下文：定位谈到 TableFormer 的片段，模拟"听到一半暂停提问"
    ctx_seg = next((s for s in script.segments if "TableFormer" in s.text), script.segments[0])
    ctx_item = next((m for m in manifest if m["segment_id"] == ctx_seg.segment_id), manifest[0])
    resume_pos = round(ctx_item["duration_seconds"] / 2, 2)

    out_dir = ROOT / "outputs" / "tutor"
    out_dir.mkdir(parents=True, exist_ok=True)
    asr = FasterWhisperASR(model_dir=args.asr_model)
    tts = Qwen3TTSProvider(local_dir=args.tts_model)

    results = []
    for i, (tag, question) in enumerate(QUESTIONS):
        # 1) 输入音频
        if i == 0 and args.audio:
            q_audio, input_kind = args.audio, "user_recording"
        else:
            q_audio = str(out_dir / f"{tag}_question_synthetic.wav")
            tts.synthesize(question, "Vivian", q_audio)
            input_kind = "synthetic_tts_input（Apache-2.0 授权音色，非真人录音）"
        # 2) ASR
        transcript = asr.transcribe(q_audio)
        (out_dir / f"{tag}_transcript.json").write_text(
            json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8")
        # 3) 检索 + LLM 回答（基于 ASR 转写，而非原始问题文本——验证真实闭环）
        answer, report = answer_question(
            paper, transcript["text"], pool,
            current_segment_text=ctx_seg.text,
            resume_segment_id=ctx_seg.segment_id,
            resume_position_seconds=resume_pos,
        )
        # 4) 导师音频
        ans_wav = str(out_dir / f"{tag}_answer.wav")
        tts.synthesize(answer.answer, "Uncle_Fu", ans_wav)
        answer.audio_path = ans_wav
        (out_dir / f"{tag}_answer.json").write_text(answer.model_dump_json(indent=2), encoding="utf-8")
        results.append({"case": tag, "input_kind": input_kind, "question_text": question,
                        "asr_text": transcript["text"], "answer": answer.model_dump(), "report": report})
        print(f"[{tag}] ASR: {transcript['text']}")
        print(f"[{tag}] ANSWER: {answer.answer} (refs={answer.evidence_ids})")

    summary = {
        "mode": "file_driven_voice_loop（非浏览器按住说话交互）",
        "context_segment": ctx_seg.segment_id, "resume_position_seconds": resume_pos,
        "cases": results,
    }
    (out_dir / "tutor_report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    log = ROOT / "reports" / "experiment_log.md"
    entry = (
        f"\n## 实验 E — {datetime.now().isoformat(timespec='seconds')}【已实际运行】\n\n"
        f"- 命令：`uv run --no-sync python scripts/experiment_tutor.py`\n"
        f"- 模式：文件驱动语音闭环（合成提问输入，非真人录音、非浏览器交互，已如实标注）\n"
        f"- 用例：{[r['case'] for r in results]}；详见 outputs/tutor/tutor_report.json\n"
        f"- 待办：人工试听导师回答音频；如有真人录音可用 --audio 复测。\n"
    )
    with log.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(json.dumps({"cases": [r["case"] for r in results], "out": str(out_dir)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
