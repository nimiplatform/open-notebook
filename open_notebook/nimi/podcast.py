import base64
from pathlib import Path

from ai_prompter import Prompter
from podcast_creator.core import create_validated_transcript_parser, outline_parser

from open_notebook.ai.provision import provision_langchain_model
from open_notebook.nimi.channel import request
from open_notebook.nimi.language import structured_model_format
from open_notebook.nimi.media import ffmpeg
from open_notebook.utils import clean_thinking_content
from open_notebook.utils.text_utils import extract_text_content


async def create_notebook_podcast(
    content, briefing, episode_profile, speaker_profile, output_dir: Path, save_progress
):
    speakers = speaker_profile.speakers
    names = [speaker["name"] for speaker in speakers]
    if not 1 <= len(names) <= 4 or len(set(names)) != len(names):
        raise ValueError("Choose one to four speakers with unique names")
    model = await provision_langchain_model(
        content,
        episode_profile.outline_llm,
        "chat",
        max_tokens=episode_profile.max_tokens,
        structured=structured_model_format(outline_parser.pydantic_object),
    )
    data = {
        "briefing": briefing,
        "num_segments": episode_profile.num_segments,
        "context": content,
        "speakers": speakers,
        "language": episode_profile.language,
    }
    prompt = Prompter(prompt_template="podcast/outline", parser=outline_parser).render(
        data=data
    )
    output = await model.ainvoke(prompt)
    outline = outline_parser.parse(
        clean_thinking_content(extract_text_content(output.content))
    )
    transcript: list[dict[str, str]] = []
    await save_progress(outline.model_dump(), transcript)
    if len(outline.segments) != episode_profile.num_segments:
        raise ValueError(
            f"Expected {episode_profile.num_segments} podcast segments, but the model generated {len(outline.segments)}. Review the saved outline and retry explicitly."
        )
    parser = create_validated_transcript_parser(names)
    model = await provision_langchain_model(
        content,
        episode_profile.transcript_llm,
        "chat",
        max_tokens=episode_profile.max_tokens,
        structured=structured_model_format(parser.pydantic_object),
    )
    for i, segment in enumerate(outline.segments):
        data.update(
            outline=outline,
            segment=segment,
            is_final=i == len(outline.segments) - 1,
            turns=3
            if segment.size == "short"
            else 6
            if segment.size == "medium"
            else 10,
            speaker_names=names,
            transcript=transcript,
        )
        prompt = Prompter(prompt_template="podcast/transcript", parser=parser).render(
            data=data
        )
        response = await model.ainvoke(prompt)
        part = parser.parse(
            clean_thinking_content(extract_text_content(response.content))
        )
        if not part.transcript:
            raise ValueError("The model returned an empty podcast transcript")
        transcript.extend(dialogue.model_dump() for dialogue in part.transcript)
        await save_progress(outline.model_dump(), transcript)
    clips = output_dir / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    voices = {s["name"]: s.get("voice_id", "") for s in speakers}
    for i, dialogue in enumerate(transcript):
        if not dialogue["dialogue"].strip():
            raise ValueError("The podcast contains an empty dialogue")
        audio = await request(
            "podcast.speak",
            {
                "text": dialogue["dialogue"],
                "voice": voices[dialogue["speaker"]],
                "language": episode_profile.language or "",
            },
        )
        source = clips / f"{i:05d}.input"
        source.write_bytes(base64.b64decode(audio["audio"], validate=True))
        # Decode the actual container, independently of the model's format.
        await ffmpeg("-i", source, "-ar", "24000", "-ac", "1", clips / f"{i:05d}.wav")
        source.unlink()
    listing = clips / "concat.txt"
    listing.write_text(
        "".join(f"file '{i:05d}.wav'\n" for i in range(len(transcript))),
        encoding="utf-8",
    )
    final = output_dir / "podcast.mp3"
    await ffmpeg(
        "-f", "concat", "-safe", "1", "-i", listing, "-c:a", "libmp3lame", final
    )
    if not final.stat().st_size:
        raise ValueError("Podcast audio is empty")
    return {
        "outline": outline.model_dump(),
        "transcript": transcript,
        "final_output_file_path": str(final),
    }
