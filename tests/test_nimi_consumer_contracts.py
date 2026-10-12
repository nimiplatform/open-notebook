import pytest
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel

from open_notebook.exceptions import ConfigurationError
from open_notebook.nimi.embeddings import NotebookEmbeddings, embedding_batches
from open_notebook.nimi.language import (
    NotebookLanguageModel,
    pipe_output,
    structured_model_format,
)


def test_second_turn_keeps_ordered_output_without_mixed_display_text():
    output = [{"type": "reasoning-continuity", "carrier": {"kind": "opaque", "version": 1, "payload": [0, 255]}}, {"type": "text", "text": "Original model output"}]
    result = NotebookLanguageModel()._payload([
        HumanMessage(content="First question"),
        AIMessage(content="Cleaned display", additional_kwargs={"nimi_output_items": output}),
        HumanMessage(content="Next question"),
    ])
    assert result["messages"][1] == {"role": "assistant", "text": "", "turnItems": [{"type": "output", "output": pipe_output(item)} for item in output]}
    assert [pipe_output(item["output"], decode=True) for item in result["messages"][1]["turnItems"]] == output
    assert result["maxTokens"] is None and result["temperature"] is None


def test_explicit_budget_and_schema_are_preserved():
    schema = {"type": "json-schema", "schema": {"type": "object", "properties": {"title": {"type": "string"}}}}
    result = NotebookLanguageModel(max_tokens=2048, temperature=0.2, structured=schema)._payload([HumanMessage(content="Question")])
    assert result["maxTokens"] == 2048 and result["temperature"] == 0.2
    assert result["responseFormat"] == schema


def test_app_parser_schema_requests_its_declared_shape_strictly():
    class Result(BaseModel):
        title: str
    format = structured_model_format(Result)
    assert format["strict"] is True
    assert format["schema"]["additionalProperties"] is False
    assert format["schema"]["required"] == ["title"]


def test_dynamic_business_dictionary_is_not_closed_into_an_empty_object():
    class Result(BaseModel):
        fields: dict[str, str]
    format = structured_model_format(Result)
    assert format["schema"]["properties"]["fields"]["additionalProperties"] == {"type": "string"}


def test_batches_obey_count_and_utf8_transport_limits():
    assert [len(batch) for batch in embedding_batches(["chunk"] * 33)] == [16, 16, 1]
    chinese = "字" * 10000
    assert [len(batch) for batch in embedding_batches([chinese] * 5)] == [2, 2, 1]
    with pytest.raises(ConfigurationError, match="32 KiB"):
        list(embedding_batches(["字" * 11000]))


@pytest.mark.asyncio
async def test_many_chunks_keep_order_and_same_runtime_space(monkeypatch):
    calls = []
    async def request(operation, payload):
        calls.append(payload["texts"])
        return {"spaceId": "space-one", "vectors": [[float(text)] for text in payload["texts"]]}
    monkeypatch.setattr("open_notebook.nimi.embeddings.request", request)
    result = await NotebookEmbeddings().aembed([str(i) for i in range(33)])
    assert [len(batch) for batch in calls] == [16, 16, 1]
    assert [vector[0] for vector in result] == list(range(33))
    assert {vector.space_id for vector in result} == {"space-one"}


@pytest.mark.asyncio
async def test_changed_space_cannot_commit_a_mixed_batch(monkeypatch):
    spaces = iter(["space-one", "space-two"])
    async def request(operation, payload):
        return {"spaceId": next(spaces), "vectors": [[1.0] for _ in payload["texts"]]}
    monkeypatch.setattr("open_notebook.nimi.embeddings.request", request)
    with pytest.raises(ConfigurationError, match="space changed"):
        await NotebookEmbeddings().aembed(["chunk"] * 17)
