from langchain_core.language_models.chat_models import BaseChatModel

from open_notebook.ai.models import model_manager
from open_notebook.exceptions import ConfigurationError


async def provision_langchain_model(
    content, model_id, default_type, **kwargs
) -> BaseChatModel:
    # Model selection belongs to Nimi AIConfig. Research task and user controls
    # remain in Open Notebook; no provider fallback or silent budget rewrite.
    if model_id and model_id != "model:nimi_language":
        raise ConfigurationError("Choose the Nimi text capability for research")
    return await model_manager.get_model(model_id or "model:nimi_language", **kwargs)
