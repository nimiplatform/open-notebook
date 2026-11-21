"""Offline bundled tiktoken cache tests for cold-start workspaces."""

import gzip
import hashlib
from pathlib import Path
from unittest.mock import patch

import pytest

import open_notebook.config as nb_config
from open_notebook.config import (
    O200K_CACHE_KEY,
    O200K_SHA256,
    ensure_tiktoken_cache,
)
from open_notebook.utils.token_utils import token_count


def test_cold_workspace_loads_o200k_offline_without_network(tmp_path, monkeypatch):
    """A brand-new empty TIKTOKEN_CACHE_DIR must load o200k_base from the bundled
    SHA-256-verified archive without making any outbound network call."""
    import tiktoken
    import tiktoken.load as tiktoken_load
    import tiktoken.registry as tiktoken_registry

    cold_cache = tmp_path / "cold-tiktoken-cache"
    monkeypatch.setenv("TIKTOKEN_CACHE_DIR", str(cold_cache))

    # Force tiktoken to reload o200k_base from disk cache rather than in-memory ENCODINGS.
    saved_encodings = dict(tiktoken_registry.ENCODINGS)
    tiktoken_registry.ENCODINGS.pop("o200k_base", None)
    try:
        with patch.object(
            tiktoken_load,
            "read_file",
            side_effect=AssertionError("Outbound tiktoken download must not occur"),
        ):
            count = token_count(
                "《潮桥灯号观测简报》苇舟-47，08:40 观测到 17 次、09:10 观测到 23 次。"
            )
            enc = tiktoken.get_encoding("o200k_base")

        assert count > 10
        assert enc.name == "o200k_base"
        seeded = cold_cache / O200K_CACHE_KEY
        assert seeded.is_file()
        assert hashlib.sha256(seeded.read_bytes()).hexdigest() == O200K_SHA256
    finally:
        tiktoken_registry.ENCODINGS.update(saved_encodings)


def test_corrupted_workspace_cache_is_repaired_atomically(tmp_path, monkeypatch):
    """A truncated or corrupted cache file is replaced with the verified archive."""
    cache_dir = tmp_path / "corrupted-cache"
    cache_dir.mkdir(parents=True)
    target = cache_dir / O200K_CACHE_KEY
    target.write_bytes(b"truncated-partial-download")
    monkeypatch.setenv("TIKTOKEN_CACHE_DIR", str(cache_dir))

    ensure_tiktoken_cache(cache_dir)

    assert hashlib.sha256(target.read_bytes()).hexdigest() == O200K_SHA256


def test_tampered_bundled_archive_fails_closed(tmp_path, monkeypatch):
    """If the bundled archive digest does not match O200K_SHA256, seeding refuses to write."""
    bad_gz = tmp_path / "tampered.gz"
    with open(bad_gz, "wb") as f_out:
        with gzip.GzipFile(mode="wb", fileobj=f_out, mtime=0) as gz:
            gz.write(b"untrusted-vocabulary-bytes")

    empty_cache = tmp_path / "dest-cache"
    monkeypatch.setattr(nb_config, "BUNDLED_O200K_GZ", Path(bad_gz))

    with pytest.raises(ValueError, match="digest mismatch"):
        ensure_tiktoken_cache(empty_cache)

    assert not (empty_cache / O200K_CACHE_KEY).exists()
