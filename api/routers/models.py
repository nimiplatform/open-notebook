from fastapi import APIRouter

from open_notebook.ai.models import Model, model_manager
from open_notebook.exceptions import NotFoundError

router = APIRouter()


@router.get("/models")
async def list_models(type: str | None = None):
    models = await Model.get_all()
    return [
        m.model_dump()
        for m in models
        if m.provider == "nimi" and (not type or m.type == type)
    ]


@router.get("/models/defaults")
async def get_default_models():
    return (await model_manager.get_defaults()).model_dump()


@router.get("/models/{model_id}")
async def get_model(model_id: str):
    model = await Model.get(model_id)
    if model.provider != "nimi":
        raise NotFoundError("Nimi capability not found")
    return model.model_dump()
