from open_notebook.exceptions import ConfigurationError
from open_notebook.nimi.channel import request


class EmbeddingVector(list):
    """A vector and the Runtime-issued space that gives its numbers meaning."""

    def __init__(self, values, space_id):
        super().__init__(values)
        self.space_id = space_id


class NotebookEmbeddings:
    model_name = "Nimi configured embedding"

    async def aembed(self, texts):
        result = await request("sources.embed", {"texts": texts})
        vectors, space_id = result["vectors"], result["spaceId"]
        if not space_id or len(vectors) != len(texts) or not vectors:
            raise ConfigurationError("Nimi returned an invalid embedding batch")
        dimensions = len(vectors[0])
        if not dimensions or any(len(vector) != dimensions for vector in vectors):
            raise ConfigurationError("Nimi returned incompatible embedding dimensions")
        return [EmbeddingVector(vector, space_id) for vector in vectors]
