import time
import uuid
from pathlib import Path
from typing import Optional

from loguru import logger
from surreal_commands import CommandInput, CommandOutput, command

from open_notebook.config import PODCASTS_FOLDER
from open_notebook.database.repository import ensure_record_id
from open_notebook.nimi.podcast import create_notebook_podcast
from open_notebook.podcasts.audio_paths import to_relative_audio_path
from open_notebook.podcasts.models import (
    EpisodeProfile,
    PodcastEpisode,
    SpeakerProfile,
)
from open_notebook.utils.model_utils import full_model_dump


def build_episode_output_dir(
    podcasts_folder: str = PODCASTS_FOLDER,
) -> tuple[str, Path]:
    """Build a filesystem-safe output directory path for a podcast episode."""
    episode_dir_name = str(uuid.uuid4())
    output_dir = Path(podcasts_folder) / "episodes" / episode_dir_name
    return episode_dir_name, output_dir


def explain_generation_failure(error_msg: str) -> Optional[str]:
    """Map a podcast-generation failure to an actionable hint, or None."""
    if "Invalid speaker name" in error_msg:
        return (
            "The transcript model returned a speaker name that is not in the "
            "speaker profile - usually a placeholder copied from the prompt "
            'such as "..." rather than an invented person. Speaker names must '
            "match the profile exactly. Retrying the episode often succeeds, "
            "since each attempt is a fresh sample."
        )

    if "Voice name" in error_msg and "not supported" in error_msg:
        return (
            "The speaker profile's voice_id is not valid for its TTS model. "
            "Check the speaker profile voices in Podcasts -> Profiles against the ones "
            "your voice model provides (the profiles seeded on install use "
            "OpenAI voice names)."
        )

    if "Requested entity was not found" in error_msg:
        return (
            "Google returns this for any resource it cannot find, without "
            "naming which one. Two candidates, likeliest first: a speaker "
            "profile voice_id that its TTS model doesn't provide (the profiles "
            "seeded on install use OpenAI voice names, which Gemini voice "
            "models reject with exactly this message), or a model id in the "
            "episode profile that doesn't exist for its provider. If the "
            "transcript finished and the failure came during audio, it is the "
            "voice."
        )

    if "Invalid json output" in error_msg or "Expecting value" in error_msg:
        return (
            "The model's response could not be parsed as JSON. Two common "
            "causes: (1) the response was truncated - podcast-creator requests "
            "up to 8192 output tokens per outline or transcript step unless the "
            "episode profile sets max_tokens; if the model stops earlier (a "
            "lower output limit, or a token-expensive language), set max_tokens "
            "to its limit or use fewer and shorter segments; (2) a model using "
            "extended thinking put all of its output inside <think> tags, leaving "
            "nothing to parse."
        )

    return None


def pick_voice_model(
    profile_name: str,
    profile_voice_model: Optional[str],
    default_voice_model: Optional[str],
) -> str:
    """Pick the TTS model for a speaker profile, falling back to DefaultModels."""
    if profile_voice_model:
        return str(profile_voice_model)

    if default_voice_model:
        return str(default_voice_model)

    raise ValueError(
        f"Speaker profile '{profile_name}' has no voice model configured and no "
        "default Text-to-Speech model is set. Select a voice model in the speaker "
        "profile, or set a default Text-to-Speech model in Manage -> Models."
    )


class PodcastGenerationInput(CommandInput):
    episode_profile: str
    speaker_profile: Optional[str] = None
    episode_name: str
    content: str
    briefing_suffix: Optional[str] = None


class PodcastGenerationOutput(CommandOutput):
    success: bool
    episode_id: Optional[str] = None
    audio_file_path: Optional[str] = None
    transcript: Optional[dict] = None
    outline: Optional[dict] = None
    processing_time: float
    error_message: Optional[str] = None


@command("generate_podcast", app="open_notebook", retry={"max_attempts": 1})
async def generate_podcast_command(
    input_data: PodcastGenerationInput,
) -> PodcastGenerationOutput:
    """Real podcast generation through Nimi speech and text with Episode Profiles."""
    start_time = time.time()

    try:
        logger.info(
            f"Starting podcast generation for episode: {input_data.episode_name}"
        )
        logger.info(f"Using episode profile: {input_data.episode_profile}")

        episode_profile = await EpisodeProfile.get_by_name(input_data.episode_profile)
        if not episode_profile:
            raise ValueError(
                f"Episode profile '{input_data.episode_profile}' not found"
            )

        speaker_ref = input_data.speaker_profile or episode_profile.speaker_config
        if not speaker_ref:
            raise ValueError(
                f"Episode profile '{episode_profile.name}' has no speaker "
                "profile configured. Please update the profile to select a "
                "speaker profile."
            )
        speaker_profile = await SpeakerProfile.resolve(speaker_ref)
        if not speaker_profile:
            if input_data.speaker_profile:
                raise ValueError(f"Speaker profile '{speaker_ref}' not found")
            raise ValueError(
                f"Episode profile '{episode_profile.name}' references a "
                "speaker profile that no longer exists. Please update the "
                "profile to select a speaker profile."
            )

        logger.info(f"Loaded episode profile: {episode_profile.name}")
        logger.info(f"Loaded speaker profile: {speaker_profile.name}")

        briefing = episode_profile.default_briefing
        if input_data.briefing_suffix:
            briefing += f"\n\nAdditional instructions: {input_data.briefing_suffix}"

        episode = PodcastEpisode(
            name=input_data.episode_name,
            episode_profile=full_model_dump(episode_profile.model_dump()),
            speaker_profile=full_model_dump(speaker_profile.model_dump()),
            command=ensure_record_id(input_data.execution_context.command_id)
            if input_data.execution_context
            else None,
            briefing=briefing,
            briefing_suffix=input_data.briefing_suffix,
            content=input_data.content,
            audio_file=None,
            transcript=None,
            outline=None,
        )
        await episode.save()

        episode_dir_name, output_dir = build_episode_output_dir()
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created output directory: {output_dir}")

        async def save_progress(outline, transcript):
            episode.outline = outline
            episode.transcript = {"transcript": transcript}
            await episode.save()

        result = await create_notebook_podcast(
            input_data.content,
            briefing,
            episode_profile,
            speaker_profile,
            output_dir,
            save_progress,
        )

        raw_audio_path = result.get("final_output_file_path") if result else None
        audio_error: Optional[str] = None
        if raw_audio_path is not None and str(raw_audio_path).startswith("ERROR:"):
            audio_error = str(raw_audio_path)
            raw_audio_path = None

        audio_file_rel = (
            to_relative_audio_path(raw_audio_path) if raw_audio_path else None
        )
        episode.audio_file = audio_file_rel
        episode.transcript = {
            "transcript": full_model_dump(result["transcript"]) if result else None
        }
        episode.outline = full_model_dump(result["outline"]) if result else None
        await episode.save()

        if audio_error:
            raise RuntimeError(f"Podcast audio generation failed: {audio_error}")

        processing_time = time.time() - start_time
        logger.info(
            f"Successfully generated podcast episode: {episode.id} in {processing_time:.2f}s"
        )

        return PodcastGenerationOutput(
            success=True,
            episode_id=str(episode.id),
            audio_file_path=audio_file_rel,
            transcript={"transcript": full_model_dump(result["transcript"])}
            if result.get("transcript")
            else None,
            outline=full_model_dump(result["outline"])
            if result.get("outline")
            else None,
            processing_time=processing_time,
        )

    except ValueError as e:
        hint = explain_generation_failure(str(e))
        if not hint:
            raise
        logger.error(f"Podcast generation failed: {e}")
        raise ValueError(f"{e}\n\nNOTE: {hint}") from e

    except Exception as e:
        logger.error(f"Podcast generation failed: {e}")
        logger.exception(e)

        error_msg = str(e)
        hint = explain_generation_failure(error_msg)
        if hint:
            error_msg += f"\n\nNOTE: {hint}"

        raise RuntimeError(error_msg) from e
