"""音频工具：用 imageio-ffmpeg 自带静态二进制读取时长与拼接（无需系统安装 ffmpeg）。"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


def ffmpeg_exe() -> str:
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def audio_duration(path: str | Path) -> float:
    """用 ffmpeg -i 的 stderr 解析时长（秒）。解析失败抛出异常，不猜测。"""
    proc = subprocess.run(
        [ffmpeg_exe(), "-i", str(path)], capture_output=True, text=True, errors="replace"
    )
    for line in proc.stderr.splitlines():
        line = line.strip()
        if line.startswith("Duration:"):
            hms = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = hms.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError(f"无法解析音频时长：{path}\n{proc.stderr[-500:]}")


def concat_wavs(wav_paths: list[str | Path], out_path: str | Path, gap_seconds: float = 0.3) -> Path:
    """按顺序拼接 wav（统一重采样 24kHz 单声道），段间插入静音。"""
    if not wav_paths:
        raise ValueError("没有可拼接的音频")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        list_file = Path(td) / "list.txt"
        entries: list[str] = []
        for p in wav_paths:
            norm = Path(td) / f"norm_{len(entries):03d}.wav"
            subprocess.run(
                [ffmpeg_exe(), "-y", "-i", str(p), "-ar", "24000", "-ac", "1", str(norm)],
                check=True, capture_output=True,
            )
            entries.append(f"file '{norm.as_posix()}'")
            if gap_seconds > 0:
                gap = Path(td) / f"gap_{len(entries):03d}.wav"
                subprocess.run(
                    [ffmpeg_exe(), "-y", "-f", "lavfi", "-i",
                     f"anullsrc=r=24000:cl=mono", "-t", str(gap_seconds), str(gap)],
                    check=True, capture_output=True,
                )
                entries.append(f"file '{gap.as_posix()}'")
        if gap_seconds > 0 and entries:
            entries.pop()  # 去掉末尾多余静音
        list_file.write_text("\n".join(entries), encoding="utf-8")
        subprocess.run(
            [ffmpeg_exe(), "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
             "-c:a", "pcm_s16le", str(out_path)],
            check=True, capture_output=True,
        )
    return out_path