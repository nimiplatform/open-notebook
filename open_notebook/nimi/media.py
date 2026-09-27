"""App-owned decoding and segmentation; Nimi owns recognition and synthesis."""

import asyncio
import base64
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import imageio_ffmpeg
from content_core import ContentCoreConfig, extract_content
from content_core.common import ExtractionOutput
from content_core.content.identification import get_file_type

from open_notebook.nimi.channel import request


async def ffmpeg(*args):
    process = await asyncio.create_subprocess_exec(
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-nostdin",
        "-v",
        "error",
        *map(str, args),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, errors = await process.communicate()
        if process.returncode:
            raise ValueError(
                f"Audio processing failed: {errors.decode('utf-8', errors='replace')[-1500:]}"
            )
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()


async def transcribe(path: str) -> ExtractionOutput:
    with tempfile.TemporaryDirectory() as directory:
        # 240-second mono WAV clips fit the finite Nimi transcription contract.
        await ffmpeg(
            "-i",
            path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            "-f",
            "segment",
            "-segment_time",
            "240",
            Path(directory) / "%06d.wav",
        )
        texts = []
        for clip in sorted(Path(directory).glob("*.wav")):
            result = await request(
                "sources.transcribe",
                {"audio": base64.b64encode(clip.read_bytes()).decode("ascii")},
            )
            if result["status"] == "transcribed":
                texts.append(result["text"])
        if not texts:
            raise ValueError("No speech was found in this source")
        return ExtractionOutput(
            content="\n".join(texts),
            title=Path(path).stem,
            source_type="file",
            identified_type="audio/wav",
        )


async def extract_notebook_content(
    *, url=None, file_path=None, content=None, config=None
):
    cfg = config or ContentCoreConfig()
    if file_path:
        mime = await get_file_type(file_path)
        if mime.startswith(("audio/", "video/")):
            return await transcribe(file_path)
    result = await extract_content(
        url=url, file_path=file_path, content=content, config=cfg
    )
    if (
        url
        and urlparse(url).hostname
        in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}
        and not result.content.strip()
    ):
        from pytubefix import YouTube

        with tempfile.TemporaryDirectory() as directory:

            def download():
                stream = YouTube(url).streams.filter(only_audio=True).first()
                if stream is None:
                    raise ValueError(
                        "This video has neither captions nor downloadable audio"
                    )
                return stream.download(output_path=directory)

            audio_path = await asyncio.to_thread(download)
            result = await transcribe(audio_path)
            result.source_type = "url"
    return result
