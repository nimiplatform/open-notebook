"""Private UTF-8 child pipes. Only the Host owns the protected SDK clients."""

import asyncio
import concurrent.futures
import json
import os
import sys
import threading
import uuid
from typing import Any, Callable

from open_notebook.exceptions import ConfigurationError, ExternalServiceError

_pending: dict[str, concurrent.futures.Future[Any]] = {}
_deltas: dict[str, Callable[[str], None]] = {}
_lock = threading.Lock()
_output_fd = sys.stdout.fileno()
_closed = True


def _send(packet):
    data = (json.dumps(packet, ensure_ascii=False, allow_nan=False) + "\n").encode(
        "utf-8"
    )
    if len(data) > 64 * 1024 * 1024:
        raise ValueError("Notebook request exceeds the worker frame limit")
    with _lock:
        if _closed:
            raise ConfigurationError("Open Notebook must run through Nimi Desktop")
        view = memoryview(data)
        while view:
            view = view[os.write(_output_fd, view) :]


def _settle(future, *, result=None, error=None):
    try:
        if error is not None:
            future.set_exception(error)
        else:
            future.set_result(result)
    except concurrent.futures.InvalidStateError:
        # The request can be canceled between the reader's done() check and
        # this terminal frame. Its late reply must not close other requests.
        if not future.cancelled():
            raise


def start_channel(on_closed):
    global _closed
    if sys.platform == "win32":
        import msvcrt

        msvcrt.setmode(0, os.O_BINARY)
        msvcrt.setmode(_output_fd, os.O_BINARY)
    _closed = False

    def read():
        global _closed
        try:
            pending = bytearray()
            while True:
                while b"\n" not in pending:
                    block = os.read(0, 65536)
                    if not block:
                        return
                    pending.extend(block)
                    if len(pending) > 64 * 1024 * 1024:
                        raise ValueError("Invalid Host response frame")
                line, _, pending = pending.partition(b"\n")
                packet = json.loads(line.decode("utf-8", errors="strict"))
                request_id = packet["id"]
                with _lock:
                    future = _pending.get(request_id)
                    callback = _deltas.get(request_id)
                if future is None or future.done():
                    continue
                if "delta" in packet:
                    if callback:
                        callback(packet["delta"])
                elif "error" in packet:
                    _settle(future, error=ExternalServiceError(packet["error"]))
                else:
                    _settle(future, result=packet["result"])
        finally:
            with _lock:
                _closed = True
                unfinished = list(_pending.values())
            for item in unfinished:
                if not item.done():
                    _settle(item, error=ConfigurationError("Nimi Host disconnected"))
            on_closed()

    threading.Thread(target=read, daemon=True, name="notebook-host").start()


async def request(operation: str, payload: dict, on_delta=None):
    request_id = str(uuid.uuid4())
    future: concurrent.futures.Future[Any] = concurrent.futures.Future()
    with _lock:
        _pending[request_id] = future
        if on_delta:
            _deltas[request_id] = on_delta
    try:
        _send({"id": request_id, "operation": operation, "payload": payload})
        return await asyncio.wait_for(asyncio.wrap_future(future), timeout=1200)
    except (asyncio.CancelledError, TimeoutError):
        try:
            _send({"cancel": request_id})
        except (ConfigurationError, BrokenPipeError):
            pass  # The Host already closed this scope.
        raise
    finally:
        with _lock:
            _pending.pop(request_id, None)
            _deltas.pop(request_id, None)
