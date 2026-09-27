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


def build_episode_output_dir(podcasts_folder: str = PODCASTS_FOLDER) -> tuple[str, Path]:
    """Build a filesystem-safe output directory path for a podcast episode.

    Uses a UUID as the directory name so the path is safe regardless of
    what the user typed as episode name (spaces, special chars, etc.).

    Builds under PODCASTS_FOLDER — the same root to_relative_audio_path()
    validates against at write time (#1030) — so the two can't drift apart.

    Returns:
        A tuple of (episode_dir_name, output_dir_path).
    """
    episode_dir_name = str(uuid.uuid4())
    output_dir = Path(podcasts_folder) / "episodes" / episode_dir_name
    return episode_dir_name, output_dir


class PodcastGenerationInput(CommandInput):
    episode_profile: str
    # Speaker profile record ID or name (the API boundary resolves the
    # user-facing name to a record ID before submitting; both are accepted
    # here for robustness).
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
    """
    Real podcast generation using podcast-creator library with Episode Profiles
    """
    start_time = time.time()

    try:
        logger.info(
            f"Starting podcast generation for episode: {input_data.episode_name}"
        )
        logger.info(f"Using episode profile: {input_data.episode_profile}")

        # 1. Load Episode and Speaker profiles from SurrealDB
        episode_profile = await EpisodeProfile.get_by_name(input_data.episode_profile)
        if not episode_profile:
            raise ValueError(
                f"Episode profile '{input_data.episode_profile}' not found"
            )

        # Honor the explicitly requested speaker profile when provided,
        # falling back to the episode profile's configured speaker
        # (a speaker_profile record ID since migration 20, None when the
        # referenced profile no longer exists).
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

        # 6. Generate briefing
        briefing = episode_profile.default_briefing
        if input_data.briefing_suffix:
            briefing += f"\n\nAdditional instructions: {input_data.briefing_suffix}"

        # Create the record for the episode and associate with the ongoing command
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

        # 7. Create output directory using UUID for filesystem-safe paths
        episode_dir_name, output_dir = build_episode_output_dir()
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Created output directory: {output_dir}")

        # 8. Generate podcast using podcast-creator
        logger.info("Starting podcast generation with podcast-creator...")

        async def save_progress(outline, transcript):
            episode.outline = outline
            episode.transcript = {"transcript": transcript}
            await episode.save()

        result = await create_notebook_podcast(input_data.content, briefing, episode_profile, speaker_profile, output_dir, save_progress)

        # podcast-creator reports audio-combination failures IN-BAND: on
        # ffmpeg/clip errors combine_audio_files() returns an "ERROR: ..."
        # string in final_output_file_path instead of a path. Detect it
        # before path conversion so the real error surfaces (below, after
        # the transcript/outline are persisted) instead of a misleading
        # "outside the podcasts folder" ValueError.
        raw_audio_path = result.get("final_output_file_path") if result else None
        audio_error: Optional[str] = None
        if raw_audio_path is not None and str(raw_audio_path).startswith("ERROR:"):
            audio_error = str(raw_audio_path)
            raw_audio_path = None

        # Store the audio path RELATIVE to PODCASTS_FOLDER (#1030). The
        # validation inside to_relative_audio_path guarantees the DB never
        # holds an absolute or root-escaping value; a violation raises
        # ValueError, which marks the job permanently failed (no retry).
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
            # Transcript/outline are saved above; fail the job with the real
            # audio-combination error instead of reporting a silent success
            # for an episode with no playable audio.
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

    except ValueError:
        raise

    except Exception as e:
        logger.error(f"Podcast generation failed: {e}")
        logger.exception(e)

        raise RuntimeError(str(e)) from e
