from open_notebook.ai.models import DefaultModels
from open_notebook.database.repository import repo_query, repo_upsert


async def prepare_workspace():
    # A fresh Host must never silently replay interrupted business work.
    await repo_query(
        "UPDATE command SET status = 'failed', error_message = 'Notebook session ended; retry explicitly' WHERE status IN ['new', 'running', 'queued']"
    )
    for kind in ("language", "embedding", "text_to_speech", "speech_to_text"):
        record_id = f"model:nimi_{kind}"
        rows = await repo_query(
            "SELECT * FROM $id",
            {"id": __import__("surrealdb").RecordID.parse(record_id)},
        )
        if not rows:
            await repo_upsert(
                "model",
                record_id,
                {
                    "name": f"Nimi · {kind.replace('_', ' ')}",
                    "provider": "nimi",
                    "type": kind,
                },
            )

    defaults = await DefaultModels.get_instance()
    for name in (
        "default_chat_model",
        "default_transformation_model",
        "large_context_model",
        "default_tools_model",
    ):
        setattr(defaults, name, "model:nimi_language")
    defaults.default_embedding_model = "model:nimi_embedding"
    defaults.default_text_to_speech_model = "model:nimi_text_to_speech"
    defaults.default_speech_to_text_model = "model:nimi_speech_to_text"
    await defaults.update()
