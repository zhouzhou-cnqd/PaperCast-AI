"""实验 C：统一 TTS 接口 + Qwen3-TTS 实现 + 明确标注的 Mock（Mock 不代表实验通过）。"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Protocol


class TTSError(RuntimeError):
    pass


class TTSProvider(Protocol):
    def synthesize(self, text: str, voice_id: str, output_path: str) -> str:
        """生成音频文件，返回实际文件路径；失败时抛出明确异常。"""
        ...


class Qwen3TTSProvider:
    """Qwen3-TTS CustomVoice（官方预设音色，不克隆真人）。首次调用会下载权重（需用户确认）。"""

    def __init__(
        self,
        model_id: str = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        device: str = "cuda:0",
        local_dir: str | None = None,
    ):
        self.model_id = local_dir or model_id
        self.device = device
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                import torch
                from qwen_tts import Qwen3TTSModel
            except ImportError as e:
                raise TTSError(f"qwen-tts 未安装：uv sync --extra tts。{e}") from e
            self._model = Qwen3TTSModel.from_pretrained(
                self.model_id, device_map=self.device, dtype=torch.bfloat16
            )
        return self._model

    def synthesize(self, text: str, voice_id: str, output_path: str) -> str:
        import soundfile as sf

        model = self._load()
        t0 = time.perf_counter()
        try:
            wavs, sr = model.generate_custom_voice(text=text, language="Chinese", speaker=voice_id)
        except Exception as e:  # noqa: BLE001
            raise TTSError(f"Qwen3-TTS 合成失败（voice={voice_id}）：{e}") from e
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out), wavs[0], sr)
        if not out.exists() or out.stat().st_size == 0:
            raise TTSError(f"输出文件无效：{out}")
        elapsed = time.perf_counter() - t0
        print(f"[qwen3-tts] {out.name} voice={voice_id} {elapsed:.1f}s")
        return str(out)


class SilentMockTTS:
    """仅用于接口/流水线联调的静音 Mock。使用它的任何运行必须标注『仅 Mock，TTS 实验未通过』。"""

    is_mock = True

    def synthesize(self, text: str, voice_id: str, output_path: str) -> str:
        import numpy as np
        import soundfile as sf

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        sr = 24000
        seconds = max(1.0, len(text) / 5.0)  # 粗略按字数估计时长
        sf.write(str(out), np.zeros(int(sr * seconds), dtype="float32"), sr)
        return str(out)