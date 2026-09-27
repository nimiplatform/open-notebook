import asyncio
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

from open_notebook.nimi.channel import request


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
                row["turnItems"] = [
                    {"type": "output", "output": item} for item in items
                ]
            payload.append(row)
        return {
            "messages": payload,
            "maxTokens": self.max_tokens,
            "temperature": self.temperature,
            "json": bool(self.structured),
        }

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        if stop:
            raise ValueError("Notebook stop sequences are not configured")
        result = await request("research.complete", self._payload(messages))
        message = AIMessage(
            content=result["text"],
            additional_kwargs={"nimi_output_items": result["outputItems"]},
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
                    additional_kwargs={"nimi_output_items": result["outputItems"]},
                )
            )
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)
