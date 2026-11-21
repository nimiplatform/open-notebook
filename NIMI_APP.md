# Open Notebook

Conduct private, source-grounded research on your own materials: collect documents, web pages, notes, and audio transcripts into notebooks, run semantic and full-text search, ask questions with clickable citations, and turn selected sources into multi-speaker podcasts.

Open Notebook on Nimi is adapted from the open-source MIT-licensed [Open Notebook](https://github.com/lfnovo/open-notebook) project by Luis Novo and contributors.

---

## What You Can Do

- **Collect & organize sources**: Import PDFs, documents, pasted text, web links, and audio/video files (transcribed through Nimi speech recognition) into dedicated notebooks, with duplicate detection and reusable **Transformations** that save structured insights.
- **Ask with clickable citations**: Control which sources and notes enter context (**Off**, **Insights only**, or **Full content**), ask grounded questions in notebook chat, click inline citations to inspect the exact source passage or insight, and save useful answers as notes.
- **Search & synthesize across notebooks**: Use **Ask and Search** to run grouped semantic vector search or keyword search across your workspace, or launch multi-stage knowledge-base synthesis.
- **Create multi-speaker podcasts**: Configure speaker profiles and episode templates, select source materials, and synthesize playable and downloadable MP3 episodes using voices from your configured Nimi speech model.

---

## Getting Started

1. Open **Open Notebook** from **Nimi Desktop** and grant the requested App Access permissions.
2. Open **Models** and select your Nimi models for each capability:
   - **Research and writing** (`text.generate`) — notebook chat, insights, transformations, Ask synthesis, and podcast outlines/scripts.
   - **Semantic search** (`text.embed`) — vector indexing and semantic search across sources and notes.
   - **Audio transcription** (`audio.transcribe`) — transcribing uploaded audio or media files into searchable source text.
   - **Podcast narration** (`audio.synthesize`) — synthesizing multi-speaker podcast audio clips.
3. Create a notebook on **Notebooks**, then add web links, uploaded files, or text sources. Enable embedding when importing if you want semantic search.
4. Open the notebook to manage source context, ask questions, click citations to verify original text, and save answers to **Notes**.
5. To produce a podcast, open **Podcasts**, set up at least one speaker profile (voices come from your active Nimi speech model) and episode profile, then generate an episode from your chosen sources.

If you switch to a different embedding model later, open **Advanced** and rebuild embeddings so existing sources are indexed in the new Runtime vector space.

---

## Using the Web Companion

The hosted Web edition at [open-notebook.nimi.xyz](https://open-notebook.nimi.xyz/) (also linked from the [Nimi App Storefront](https://nimi.ai/apps/open-notebook)) connects remotely to the Open Notebook workspace running on your primary PC under the same Nimi account.

- **PC requirement**: Keep **Nimi Desktop** and **Open Notebook `1.15.1` or newer** running on your host PC (`1.14.7` and earlier do not expose the workspace Integration surface required by the Web companion).
- **First-time setup**: Sign in on the Web app with your Nimi account, confirm the Web source once in **Nimi Home** on your PC, and approve the **Open Notebook on this PC** workspace Integration permission.
- **Models & session behavior**: All AI execution and model settings remain owned by the PC app's **Models** page. The Web app keeps credentials only in page memory, so reloading the page or reopening a deep link (`#/notebooks/...`) returns to the official sign-in flow before restoring the notebook route; unsaved browser edits are not preserved across reloads.

---

## Data Handling & Limitations

- **Local PC storage**: Notebooks, SurrealDB databases, uploaded files, notes, chat checkpoints, and generated podcast MP3s are stored on the host PC under your account-scoped Nimi workspace directory (`~/Library/Application Support/Open Notebook — Nimi/` on macOS; `%APPDATA%/Open Notebook — Nimi/` on Windows). Closing the window does not delete saved content.
- **Nimi AI & network access**: Nimi manages your session, App Access, model routing (on-device or cloud), and AI usage. When you import URLs, Open Notebook fetches those web resources directly. Files downloaded in the Web app are saved to the browser's device.
- **Accuracy & retries**: AI-generated answers, summaries, transcripts, and podcast scripts can contain inaccuracies—always verify important claims against the cited source text. Interrupted generations or background commands do not auto-replay after a disconnect or restart; inspect the reported error and retry explicitly.
- **Platform availability**: Native desktop packages target macOS (`arm64`) and Windows (`x86_64`), paired with the hosted Web companion. Android remains a local development build and is not publicly distributed.

---

## Help & Feedback

Report issues or share reproduction steps at [github.com/nimiplatform/open-notebook/issues](https://github.com/nimiplatform/open-notebook/issues). Remove private documents or personal information before sharing logs or screenshots.
