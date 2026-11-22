"""环境自检：结果写入 reports/environment.md（密钥只检查存在性，不输出值）。"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMANDS = ["python --version", "uv --version", "git --version", "ffmpeg -version", "nvidia-smi", "node --version"]


def run(cmd: str) -> str:
    exe = cmd.split()[0]
    if shutil.which(exe) is None:
        return f"[NOT FOUND] {exe} 不在 PATH 中"
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        out = (p.stdout or p.stderr).strip()
        return out[:1500]
    except Exception as e:  # noqa: BLE001
        return f"[ERROR] {e}"


def main() -> None:
    lines = [
        "# 环境检测报告",
        f"\n生成时间：{datetime.now().isoformat(timespec='seconds')}",
        f"\n- OS: {platform.platform()}",
        f"- 当前解释器: {sys.executable} ({sys.version.split()[0]})",
        f"- DEEPSEEK_API_KEY: {'SET（值已隐藏）' if os.getenv('DEEPSEEK_API_KEY') else 'NOT SET'}",
        "\n## 命令输出\n",
    ]
    for cmd in COMMANDS:
        lines.append(f"### `{cmd}`\n\n```\n{run(cmd)}\n```\n")
    out = ROOT / "reports" / "environment.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"written: {out}")


if __name__ == "__main__":
    main()