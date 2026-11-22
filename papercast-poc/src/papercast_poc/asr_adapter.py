"""实验 E：ASR 适配器（faster-whisper，本地权重，CPU int8）。

Windows 下 ctranslate2 GPU 需另装 cuBLAS/cuDNN9 DLL，PoC 用 CPU int8
（small 模型转写数秒提问音频足够快，README 基准：13 分钟音频约 1m42s）。
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Protocol


class ASRError(RuntimeError):
    pass


class ASRProvider(Protocol):
    def transcribe(self, audio_path: str) -> dict:
        """返回 {"text": str, "language": str, "language_probability": float, "segments": [...]}。"""
        ...


class FasterWhisperASR:
    def __init__(
        self,
        model_dir: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        self.model_dir = model_dir
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as e:
                raise ASRError(f"faster-whisper 未安装：uv sync --extra asr。{e}") from e
            self._model = WhisperModel(
                self.model_dir, device=self.device, compute_type=self.compute_type
            )
        return self._model

    def transcribe(self, audio_path: str) -> dict:
        model = self._load()
        p = Path(audio_path)
        if not p.exists():
            raise ASRError(f"音频文件不存在：{audio_path}")
        t0 = time.perf_counter()
        try:
            segments, info = model.transcribe(str(p), language="zh", beam_size=5)
            seg_list = [
                {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
                for s in segments  # 生成器：迭代时才真正执行转写
            ]
        except Exception as exc:
            raise ASRError("音频无法解码或识别，请重新录音") from exc
        text = "".join(s["text"] for s in seg_list).strip()
        elapsed = round(time.perf_counter() - t0, 2)
        if not text:
            raise ASRError(f"转写结果为空（音频可能无语音）：{audio_path}")
        print(f"[faster-whisper] {p.name} -> {len(text)} chars, {elapsed}s")
        return {
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "segments": seg_list,
            "asr_seconds": elapsed,
        }
