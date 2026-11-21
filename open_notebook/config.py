import gzip
import hashlib
import os
import uuid
from pathlib import Path

# ROOT DATA FOLDER
DATA_FOLDER = os.environ.get("OPEN_NOTEBOOK_DATA_DIR", "./data")

# LANGGRAPH CHECKPOINT FILE
sqlite_folder = f"{DATA_FOLDER}/sqlite-db"
os.makedirs(sqlite_folder, exist_ok=True)
LANGGRAPH_CHECKPOINT_FILE = f"{sqlite_folder}/checkpoints.sqlite"

# UPLOADS FOLDER
UPLOADS_FOLDER = f"{DATA_FOLDER}/uploads"
os.makedirs(UPLOADS_FOLDER, exist_ok=True)

# PODCASTS FOLDER
# Matches the root that build_episode_output_dir() (commands/podcast_commands.py)
# creates episode directories under when called with DATA_FOLDER in production.
PODCASTS_FOLDER = f"{DATA_FOLDER}/podcasts"
os.makedirs(PODCASTS_FOLDER, exist_ok=True)

# TIKTOKEN CACHE FOLDER & BUNDLED OFFLINE VOCABULARY
# Reads TIKTOKEN_CACHE_DIR from the environment so Docker/Host can redirect the cache,
# and seeds o200k_base from the bundled SHA-256-verified archive so cold workspaces
# never stall on outbound network downloads during the first question or context build.
O200K_BLOB_URL = (
    "https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken"
)
O200K_CACHE_KEY = "fb374d419588a4632f3f557e76b4b70aebbca790"
O200K_SHA256 = "446a9538cb6c348e3516120d7c08b09f57c36495e2acfffe59a5bf8b0cfb1a2d"
BUNDLED_O200K_GZ = (
    Path(__file__).resolve().parent / "tiktoken_cache" / "o200k_base.tiktoken.gz"
)

TIKTOKEN_CACHE_DIR = (
    os.environ.get("TIKTOKEN_CACHE_DIR", "").strip() or f"{DATA_FOLDER}/tiktoken-cache"
)


def ensure_tiktoken_cache(cache_dir: str | os.PathLike[str] | None = None) -> str:
    """Ensure TIKTOKEN_CACHE_DIR contains the SHA-256-verified o200k_base vocabulary."""
    resolved_dir = (
        str(cache_dir).strip()
        if cache_dir is not None
        else (os.environ.get("TIKTOKEN_CACHE_DIR", "").strip() or TIKTOKEN_CACHE_DIR)
    )
    os.makedirs(resolved_dir, exist_ok=True)
    os.environ["TIKTOKEN_CACHE_DIR"] = resolved_dir

    dest = Path(resolved_dir) / O200K_CACHE_KEY
    if dest.is_file():
        try:
            if hashlib.sha256(dest.read_bytes()).hexdigest() == O200K_SHA256:
                return resolved_dir
        except OSError:
            pass

    if not BUNDLED_O200K_GZ.is_file():
        raise FileNotFoundError(f"Bundled tiktoken archive missing: {BUNDLED_O200K_GZ}")

    raw = gzip.decompress(BUNDLED_O200K_GZ.read_bytes())
    actual_sha256 = hashlib.sha256(raw).hexdigest()
    if actual_sha256 != O200K_SHA256:
        raise ValueError(
            f"Bundled o200k_base digest mismatch: expected {O200K_SHA256}, got {actual_sha256}"
        )

    tmp_path = dest.with_name(f"{O200K_CACHE_KEY}.{uuid.uuid4().hex}.tmp")
    tmp_path.write_bytes(raw)
    os.replace(tmp_path, dest)
    return resolved_dir


ensure_tiktoken_cache(TIKTOKEN_CACHE_DIR)
