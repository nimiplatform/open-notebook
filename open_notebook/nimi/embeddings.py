from collections.abc import Iterable, Iterator

from open_notebook.exceptions import ConfigurationError
from open_notebook.nimi.channel import request


def embedding_batches(texts: Iterable[str]) -> Iterator[list[str]]:
    batch: list[str] = []
    size = 0
    for text in texts:
        if not isinstance(text, str) or not text.strip():
            raise ConfigurationError("Embedding inputs must contain text")
        length = len(text.encode("utf-8"))
        if length > 32 * 1024:
            raise ConfigurationError("Embedding chunk exceeds 32 KiB; reduce the chunk size")
        if batch and (len(batch) == 16 or size + length > 64 * 1024):
            yield batch
            batch, size = [], 0
        batch.append(text)
        size += length
    if batch:
        yield batch


class EmbeddingVector(list[float]):
    """A vector and the Runtime-issued space that gives its numbers meaning."""

    def __init__(self, values: Iterable[float], space_id: str) -> None:
        super().__init__(values)
        self.space_id = space_id


# @nimi-authority: rule.nimi.runtime.ai-provider.embedding-retrieval-purpose
class NotebookEmbeddings:
    model_name = "Nimi configured embedding"

    async def aembed(
        self, texts: Iterable[str], *, purpose: str = "retrieval-document"
    ) -> list[EmbeddingVector]:
        if purpose not in {"retrieval-document", "retrieval-query"}:
            raise ConfigurationError("Invalid embedding retrieval purpose")
        output: list[EmbeddingVector] = []
        space_id: str | None = None
        dimensions: int | None = None
        # Validate the entire input before any paid/model work, then preserve
        # its order and one Runtime-issued space across every finite batch.
        for batch in list(embedding_batches(texts)):
            result = await request("sources.embed", {"texts": batch, "purpose": purpose})
            vectors, current_space = result["vectors"], result["spaceId"]
            if not current_space or len(vectors) != len(batch) or not vectors:
                raise ConfigurationError("Nimi returned an invalid embedding batch")
            if space_id is not None and space_id != current_space:
                raise ConfigurationError("Nimi embedding space changed during this operation")
            current_dimensions = len(vectors[0])
            if not current_dimensions or any(len(v) != current_dimensions for v in vectors) or (dimensions is not None and dimensions != current_dimensions):
                raise ConfigurationError("Nimi returned incompatible embedding dimensions")
            space_id, dimensions = current_space, current_dimensions
            output.extend(EmbeddingVector(vector, space_id) for vector in vectors)
        return output
