from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from open_notebook.nimi.podcast import create_notebook_podcast


def test_retry_keeps_additional_episode_instructions():
    episode = SimpleNamespace(
        episode_profile={"name": "research"},
        speaker_profile={"name": "speakers"},
        name="海风简报",
        content="研究资料",
        briefing_suffix="只用中文。\n保留原始数据。",
        audio_file=None,
        get_job_detail=AsyncMock(return_value={"status": "failed"}),
        delete=AsyncMock(),
    )
    with (
        patch(
            "api.routers.podcasts.PodcastService.get_episode",
            new=AsyncMock(return_value=episode),
        ),
        patch(
            "api.routers.podcasts.PodcastService.submit_generation_job",
            new=AsyncMock(return_value="command:retry"),
        ) as submit,
    ):
        result = TestClient(
            app, headers={"X-Notebook-Process": "notebook-test-process"}
        ).post("/api/podcasts/episodes/episode:failed/retry")
    assert result.status_code == 200
    assert submit.await_args is not None
    assert submit.await_args.kwargs["briefing_suffix"] == "只用中文。\n保留原始数据。"


@pytest.mark.asyncio
async def test_wrong_outline_count_preserves_the_draft_before_failure(tmp_path):
    profile = SimpleNamespace(
        outline_llm="model:nimi_language",
        max_tokens=None,
        num_segments=3,
        language="zh-CN",
    )
    speaker = SimpleNamespace(
        speakers=[{"name": "林青", "backstory": "研究者", "personality": "简短"}]
    )
    model = SimpleNamespace(
        ainvoke=AsyncMock(
            return_value=SimpleNamespace(
                content='{"segments":[{"name":"实际的大纲","description":"只有一段","size":"short"}]}'
            )
        )
    )
    save = AsyncMock()
    with patch(
        "open_notebook.nimi.podcast.provision_langchain_model",
        new=AsyncMock(return_value=model),
    ):
        with pytest.raises(
            ValueError, match="Expected 3 podcast segments, but the model generated 1"
        ):
            await create_notebook_podcast(
                "资料", "三段", profile, speaker, tmp_path, save
            )
    assert save.await_args is not None
    assert save.await_args.args[0]["segments"][0]["name"] == "实际的大纲"
    assert save.await_args.args[1] == []
    assert "selected podcast language: zh-CN" in model.ainvoke.await_args.args[0]


@pytest.mark.asyncio
async def test_transcript_preserves_profile_language_and_speaker_voice(tmp_path):
    profile = SimpleNamespace(
        outline_llm="model:nimi_language",
        transcript_llm="model:nimi_language",
        max_tokens=None,
        num_segments=3,
        language="fr-FR",
    )
    speaker = SimpleNamespace(
        speakers=[
            {
                "name": "Lin",
                "backstory": "researcher",
                "personality": "brief",
                "voice_id": "selected-voice",
            }
        ]
    )
    model = SimpleNamespace(
        ainvoke=AsyncMock(
            side_effect=[
                SimpleNamespace(
                    content='{"segments":['
                    + ",".join(
                        '{"name":"Plan","description":"Research","size":"short"}'
                        for _ in range(3)
                    )
                    + "]}"
                ),
                *[
                    SimpleNamespace(
                        content='{"transcript":[{"speaker":"Lin","dialogue":"Bonjour."}]}'
                    )
                    for _ in range(3)
                ],
            ]
        )
    )
    with (
        patch(
            "open_notebook.nimi.podcast.provision_langchain_model",
            new=AsyncMock(return_value=model),
        ),
        patch(
            "open_notebook.nimi.podcast.request",
            new=AsyncMock(side_effect=ValueError("speech unavailable")),
        ) as speech,
    ):
        with pytest.raises(ValueError, match="speech unavailable"):
            await create_notebook_podcast(
                "English source",
                "Explain this research",
                profile,
                speaker,
                tmp_path,
                AsyncMock(),
            )
    assert len(model.ainvoke.await_args_list) == 4
    for call in model.ainvoke.await_args_list:
        assert "selected podcast language: fr-FR" in call.args[0]
    assert speech.await_args is not None
    assert speech.await_args.args == (
        "podcast.speak",
        {"text": "Bonjour.", "voice": "selected-voice", "language": "fr-FR"},
    )
