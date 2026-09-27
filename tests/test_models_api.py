"""The notebook exposes capability slots; Nimi owns model registrations."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from api.main import app
from open_notebook.ai.models import Model

client = TestClient(app, headers={"X-Notebook-Process": "notebook-test-process"})


def test_provider_registration_route_is_retired():
    response = client.post(
        "/api/models",
        json={"name": "unmanaged", "provider": "openai", "type": "language"},
    )
    assert response.status_code == 405


def test_credentials_route_is_retired():
    assert client.get("/api/credentials").status_code == 404


def test_only_nimi_capability_slots_are_listed():
    models = [
        Model(
            id="model:nimi_language", name="Nimi text", provider="nimi", type="language"
        ),
        Model(id="model:old", name="old", provider="openai", type="language"),
    ]
    with patch("api.routers.models.Model.get_all", new=AsyncMock(return_value=models)):
        response = client.get("/api/models")
    assert response.status_code == 200
    assert [m["id"] for m in response.json()] == ["model:nimi_language"]
