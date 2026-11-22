import pytest
from pathlib import Path

from papercast_poc.asr_adapter import ASRError, FasterWhisperASR


class _BrokenModel:
    def transcribe(self, *args, **kwargs):
        raise RuntimeError("decoder failed")


def test_decoder_failure_becomes_user_facing_asr_error():
    audio = Path(__file__)
    asr = FasterWhisperASR()
    asr._model = _BrokenModel()

    with pytest.raises(ASRError, match="音频无法解码或识别"):
        asr.transcribe(str(audio))
