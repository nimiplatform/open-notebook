# Nimi foundation for the desktop adaptation

Status: implemented in this adaptation; acceptance is tracked in README.nimi.md.

Keep Next.js, FastAPI, SurrealDB and the App's research workflows. Use the official
Desktop-supervised Electron Host and the public SDK/Kit as the only Nimi carrier.
The Python process receives bounded research, embedding and speech callback
results over private UTF-8 pipes. It never receives Nimi credentials or a Runtime
endpoint. The local HTTP secret is an App transport detail, not a user account.

Nimi owns account/session authorization, AIConfig, inference and vector-space
identity. Open Notebook owns prompts, sources, indexing, notebooks, podcast
profiles, audio assembly and recovery. Each vector record stores its Runtime
space; a changed embedding selection requires re-embedding content for that space.

Nimi managed JSON stores a random workspace reference. Durable databases, uploads,
checkpoints and podcasts live under the disclosed App-owned OS directory. The
reference follows the current protected Nimi storage partition. Session loss
fences old Host work and stops Python; a new scope loads its own workspace.

The user chose no public Integration operations in this phase. This adaptation
uses the four existing capabilities and does not invent a Python Runtime proxy,
a new Nimi task owner, or a second model/provider registry.
