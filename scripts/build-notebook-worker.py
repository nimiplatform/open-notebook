"""Package the actual Python business backend and its data with PyInstaller."""

import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
args = [
    sys.executable,
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--name",
    "notebook-worker",
    "--distpath",
    str(root / ".nimi/local/backend"),
    "--workpath",
    str(root / ".nimi/local/python-build"),
    "--specpath",
    str(root / ".nimi/local/python-build"),
    "--paths",
    str(root),
    # imageio resolves its version through distribution metadata at import time.
    "--copy-metadata",
    "imageio",
]
for module in [
    "api",
    "commands",
    "open_notebook",
    "surreal_commands",
    "content_core",
    "podcast_creator",
    "imageio_ffmpeg",
    "ai_prompter",
    "tiktoken_ext",
]:
    args += ["--collect-all", module]
for source, dest in [
    ("open_notebook/database/migrations", "open_notebook/database/migrations"),
    ("prompts", "prompts"),
    ("pyproject.toml", "."),
]:
    args += ["--add-data", f"{root / source}:{dest}"]
args += [str(root / "open_notebook/nimi/worker.py")]
subprocess.run(args, cwd=root, check=True)
