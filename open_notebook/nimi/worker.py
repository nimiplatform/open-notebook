"""One supervised process owns API, async commands and the business pipe."""

import asyncio
import os
import sys

from open_notebook.nimi.channel import start_channel


def main():
    if not os.environ.get("OPEN_NOTEBOOK_HOST_TOKEN"):
        raise RuntimeError("Start Open Notebook through pnpm dev and Nimi Desktop")
    # Third-party progress and print output must never enter the JSON pipe.
    sys.stdout = sys.stderr
    import uvicorn

    async def run():
        config = uvicorn.Config(
                "api.main:app",
                host="127.0.0.1",
                port=int(os.environ["OPEN_NOTEBOOK_API_PORT"]),
                log_level="warning",
            )
        # Windows numerical DLL initialization can inspect CRT stdin. Load the
        # business modules before a blocking reader holds that descriptor.
        config.load()
        server = uvicorn.Server(config)
        loop = asyncio.get_running_loop()
        start_channel(
            lambda: loop.call_soon_threadsafe(setattr, server, "should_exit", True)
        )
        await server.serve()

    asyncio.run(run())


if __name__ == "__main__":
    main()
