import pytest

from open_notebook.exceptions import ConfigurationError
from open_notebook.nimi.embeddings import EmbeddingVector, NotebookEmbeddings
from open_notebook.utils.embedding import mean_pool_embeddings


@pytest.mark.asyncio
async def test_pooling_retains_the_runtime_space():
    vector = await mean_pool_embeddings(
        [EmbeddingVector([1.0, 0.0], "space-a"), EmbeddingVector([0.0, 1.0], "space-a")]
    )
    assert vector.space_id == "space-a"
    assert vector == pytest.approx([0.70710678, 0.70710678])


@pytest.mark.asyncio
async def test_equal_dimensions_do_not_make_spaces_compatible():
    with pytest.raises(ConfigurationError, match="different embedding spaces"):
        await mean_pool_embeddings(
            [
                EmbeddingVector([1.0, 0.0], "space-a"),
                EmbeddingVector([0.0, 1.0], "space-b"),
            ]
        )


@pytest.mark.asyncio
async def test_empty_runtime_space_is_rejected(monkeypatch):
    async def response(*args):
        return {"vectors": [[1.0, 0.0]], "spaceId": ""}

    monkeypatch.setattr("open_notebook.nimi.embeddings.request", response)
    with pytest.raises(ConfigurationError, match="invalid embedding batch"):
        await NotebookEmbeddings().aembed(["hello"])
