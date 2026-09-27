from typing import ClassVar, Dict, Optional, Sequence, Union

from loguru import logger
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel, RecordModel
from open_notebook.exceptions import ConfigurationError


class Model(ObjectModel):
    table_name: ClassVar[str] = "model"
    name: str
    provider: str
    type: str

    @classmethod
    async def get_models_by_type(cls, model_type):
        models = await repo_query(
            "SELECT * FROM model WHERE type=$model_type;", {"model_type": model_type}
        )
        return [Model(**model) for model in models]

    @classmethod
    async def get_display_info_for_ids(
        cls, model_ids: Sequence[Union[str, RecordID]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Batch-fetch {provider, name} display info for many model IDs in one
        query.

        Episode listing resolves the model references stored in the
        denormalized episode/speaker profile snapshots (outline_llm,
        transcript_llm, voice_model) into human-readable display fields.
        Doing that with Model.get() would cost one round trip per reference
        per episode (no connection pooling in the repository layer) - this
        collects the distinct IDs and resolves them in a single query,
        mirroring PodcastEpisode.get_job_details_for_commands().

        Unresolvable IDs (deleted models) are simply absent from the result;
        a total query failure returns an empty dict so display resolution
        degrades gracefully instead of breaking the caller.
        """
        ids = sorted({str(mid) for mid in model_ids if mid})
        grouped: Dict[str, Dict[str, str]] = {}
        if not ids:
            return grouped
        try:
            result = await repo_query(
                "SELECT id, name, provider FROM model WHERE id IN $model_ids",
                {"model_ids": [ensure_record_id(mid) for mid in ids]},
            )
        except Exception as e:
            logger.error(f"Error batch-fetching model display info: {e}")
            return grouped
        for row in result:
            grouped[str(row.get("id"))] = {
                "provider": row.get("provider", ""),
                "name": row.get("name", ""),
            }
        return grouped


class DefaultModels(RecordModel):
    record_id: ClassVar[str] = "open_notebook:default_models"
    default_chat_model: Optional[str] = None
    default_transformation_model: Optional[str] = None
    large_context_model: Optional[str] = None
    default_text_to_speech_model: Optional[str] = None
    default_speech_to_text_model: Optional[str] = None
    # default_vision_model: Optional[str]
    default_embedding_model: Optional[str] = None
    default_tools_model: Optional[str] = None

    @classmethod
    async def get_instance(cls) -> "DefaultModels":
        """Always fetch fresh defaults from database (override parent caching behavior)"""
        result = await repo_query(
            "SELECT * FROM ONLY $record_id",
            {"record_id": ensure_record_id(cls.record_id)},
        )

        if result:
            if isinstance(result, list) and len(result) > 0:
                data = result[0]
            elif isinstance(result, dict):
                data = result
            else:
                data = {}
        else:
            data = {}

        # Create new instance with fresh data (bypass singleton cache)
        instance = object.__new__(cls)
        object.__setattr__(instance, "__dict__", {})
        super(RecordModel, instance).__init__(**data)
        return instance


class ModelManager:
    async def get_defaults(self):
        return await DefaultModels.get_instance()

    async def get_model(self, model_id: str, **kwargs):
        if model_id == "model:nimi_language":
            from open_notebook.nimi.language import NotebookLanguageModel

            return NotebookLanguageModel(
                **{
                    k: v
                    for k, v in kwargs.items()
                    if k in {"max_tokens", "temperature", "structured"}
                }
            )
        if model_id == "model:nimi_embedding":
            from open_notebook.nimi.embeddings import NotebookEmbeddings

            return NotebookEmbeddings()
        raise ConfigurationError(
            "Select the Nimi capability in Models. Provider credentials are managed by Nimi."
        )

    async def get_embedding_model(self, **kwargs):
        return await self.get_model("model:nimi_embedding", **kwargs)

    async def get_default_model(self, model_type: str, **kwargs):
        return await self.get_model(
            "model:nimi_embedding"
            if model_type == "embedding"
            else "model:nimi_language",
            **kwargs,
        )


model_manager = ModelManager()
