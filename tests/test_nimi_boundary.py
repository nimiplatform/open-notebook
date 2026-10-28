import subprocess
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth import NotebookHostMiddleware
from open_notebook.ai.provision import provision_langchain_model
from open_notebook.exceptions import ConfigurationError
from open_notebook.nimi.channel import request
from open_notebook.nimi.language import NotebookLanguageModel


def test_backend_import_keeps_https_certificate_verification():
    # content-core's YouTube module changes the process-wide HTTPS factory
    # during import. Exercise the actual API import order in a clean process.
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import api.main, ssl; context = ssl._create_default_https_context(); assert context.verify_mode == ssl.CERT_REQUIRED; assert context.check_hostname",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr


def test_loopback_api_requires_the_supervised_process_secret(monkeypatch):
    monkeypatch.setenv("OPEN_NOTEBOOK_HOST_TOKEN", "test-only-notebook-process")
    app = FastAPI()
    app.add_middleware(NotebookHostMiddleware)

    @app.get("/api/notebooks")
    async def notebooks():
        return []

    client = TestClient(app)
    assert client.get("/api/notebooks").status_code == 401
    assert (
        client.get(
            "/api/notebooks",
            headers={"Authorization": "Bearer test-only-notebook-process"},
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/notebooks",
            headers={"X-Notebook-Process": "test-only-notebook-process"},
        ).status_code
        == 200
    )


@pytest.mark.asyncio
async def test_unsupervised_ai_fails_closed():
    with pytest.raises(ConfigurationError, match="Nimi Desktop"):
        await request("research.complete", {"messages": []})


@pytest.mark.asyncio
@pytest.mark.parametrize("model_id", ["model:openai", "model:nimi_embedding"])
async def test_provider_model_override_cannot_escape_nimi(model_id):
    with pytest.raises(ConfigurationError, match="Nimi text capability"):
        await provision_langchain_model("hello", model_id, "chat")


@pytest.mark.asyncio
async def test_user_budget_is_preserved():
    model = await provision_langchain_model(
        "hello", None, "chat", max_tokens=4096, temperature=0.4
    )
    assert isinstance(model, NotebookLanguageModel)
    assert model.max_tokens == 4096
    assert model.temperature == 0.4


def test_late_terminal_reply_does_not_break_another_request():
    from concurrent.futures import Future

    from open_notebook.nimi.channel import _settle

    canceled = Future[dict[str, str]]()
    canceled.cancel()
    # Represents cancellation after the reader selected this pending future.
    _settle(canceled, result={"text": "late"})
    active = Future[dict[str, str]]()
    _settle(active, result={"text": "中文结果"})
    assert active.result() == {"text": "中文结果"}
    assert canceled.cancelled()
