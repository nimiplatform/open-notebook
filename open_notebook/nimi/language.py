import asyncio
import base64
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

from open_notebook.nimi.channel import request


def pipe_output(item, *, decode=False):
    if item["type"] != "reasoning-continuity":
        return item
    carrier = item["carrier"]
    payload = list(base64.b64decode(carrier["payload"], validate=True)) if decode else base64.b64encode(bytes(carrier["payload"])).decode("ascii")
    return {**item, "carrier": {**carrier, "payload": payload}}


def structured_model_format(model_type):
    """An App-owned parser's declared fields define its exact model result."""
    def close(value):
        if isinstance(value, list):
            return [close(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {key: close(item) for key, item in value.items()}
        if result.get("type") == "object" and "additionalProperties" not in result:
            result["additionalProperties"] = False
        return result
    return {"type": "json-schema", "schema": close(model_type.model_json_schema()), "strict": True}


class NotebookLanguageModel(BaseChatModel):
    """Keep LangGraph's research workflow; the Host performs each model step."""

    max_tokens: int | None = None
    temperature: float | None = None
    structured: dict | None = None

    @property
    def _llm_type(self) -> str:
        return "nimi-notebook"

    def _payload(self, messages):
        payload = []
        for message in messages:
            role = {"human": "user", "ai": "assistant", "system": "system"}.get(
                message.type
            )
            if not role or not isinstance(message.content, str):
                raise ValueError("Notebook research requires text messages")
            row: dict[str, Any] = {"role": role, "text": message.content}
            items = message.additional_kwargs.get("nimi_output_items")
            if items:
                if role != "assistant":
                    raise ValueError("Only assistant messages carry Nimi model output")
                row["text"] = ""
                row["turnItems"] = [
                    {"type": "output", "output": pipe_output(item)} for item in items
                ]
            payload.append(row)
        return {
            "messages": payload,
            "maxTokens": self.max_tokens,
            "temperature": self.temperature,
            "responseFormat": (
                {"type": "json-object"}
                if self.structured and self.structured.get("type") == "json"
                else self.structured
            ),
        }

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        if stop:
            raise ValueError("Notebook stop sequences are not configured")
        result = await request("research.complete", self._payload(messages))
        message = AIMessage(
            content=result["text"],
            additional_kwargs={"nimi_output_items": [pipe_output(item, decode=True) for item in result["outputItems"]]},
        )
        return ChatResult(generations=[ChatGeneration(message=message)])

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        return asyncio.run(self._agenerate(messages, stop, run_manager, **kwargs))

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        if stop:
            raise ValueError("Notebook stop sequences are not configured")
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[str | None] = asyncio.Queue()
        task = asyncio.create_task(
            request(
                "research.complete",
                self._payload(messages),
                lambda text: loop.call_soon_threadsafe(queue.put_nowait, text),
            )
        )
        task.add_done_callback(lambda _: queue.put_nowait(None))
        try:
            while (text := await queue.get()) is not None:
                yield ChatGenerationChunk(message=AIMessageChunk(content=text))
            result = await task
            yield ChatGenerationChunk(
                message=AIMessageChunk(
                    content="",
                    additional_kwargs={"nimi_output_items": [pipe_output(item, decode=True) for item in result["outputItems"]]},
                )
            )
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)
