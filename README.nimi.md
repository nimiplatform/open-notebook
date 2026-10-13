# Open Notebook on Nimi

This adaptation keeps the upstream Next.js research interface, FastAPI services,
SurrealDB notebooks, LangGraph research and chat, transformations, sources and
podcast profiles. Nimi Desktop supervises the Electron Host. The Host uses the
public SDK/Kit for authorization, model configuration, text, embeddings and speech.

## Windows candidate 1.14.7 — 2026-10-13

Installed 1.14.6 on Nimi 0.2.3 exposed a separate Electron renderer startup
failure: omitting `SystemRoot` from the utility process environment prevented
Windows socket initialization. Version 1.14.7 forwards that OS variable without
inheriting Host credentials. A real Electron utility-process regression covers
loopback serving, environment isolation, shutdown and early child exit. Startup
failure now displays an error and terminates the Host instead of leaving a
windowless running App. Installed business acceptance of 1.14.7 is pending.
Production App Tools check and the full test command pass: one real Electron
process regression, 573 backend tests and 138 frontend tests.

Uses published SDK 0.21.0, Kit/native 0.19.3, App Tools 0.12.2 and Nimi Coding 0.6.5. The 573 Python tests and 138 frontend tests pass. Loading business modules before the blocking input reader fixes the reproduced Windows NumPy/DLL startup deadlock. The actual packaged Python API and SurrealDB initialized an isolated workspace. In the supervised App against Nimi 0.2.2, `Windows 蓝鸟743研究` retained its text source, Dense Summary insight, Nimi embeddings and cited Chinese chat. The answer recovered Lin Lan, Runtime Bridge and six observations; extra model interpretations were not independently fact-checked. Windows podcasts, recognition and candidate installation remain NOT-VERIFIED. Earlier macOS evidence keeps its stated versions.

## Ownership

- Open Notebook owns sources, notebook membership, search and prompt composition,
  podcast planning, speaker profiles, media decoding and durable business data.
- Nimi owns its account session, App Access, model/provider credentials, AIConfig,
  inference and the Runtime-issued embedding space.
- The Python worker has private UTF-8 pipes for four fixed business callbacks. It
  receives no Nimi credentials or Runtime endpoint. Its HTTP listener is loopback
  only, protected by a per-process App secret added outside renderer JavaScript.
- A random workspace reference in Nimi managed storage selects the App's durable
  database and media directory. The Electron profile remains Desktop-owned.
- No public Integration operations are registered in this phase.

## Development

Use a matching running Nimi with developer mode enabled. Candidate 1.14.7 uses
the released npm SDK 0.21.0, Kit/native 0.19.3, App Tools 0.12.2 and Nimi Coding
0.6.5. The root frozen pnpm lock records public registry integrity; local Nimi
tarball and source-workspace overrides are removed.

```sh
pnpm install --frozen-lockfile
uv sync --locked --group dev
pnpm run setup:backend
pnpm run check
pnpm dev
```

Use `pnpm exec nimi-app dev --list-registrations` and its current explicit resume
selector to return to the same development workspace. A new registration is a new
storage audience. The Host starts and stops SurrealDB and the Python API/worker.
Model selection is in **Models** and uses the shared Kit AIConfig UI. Functional
acceptance uses `pnpm dev` and the exact loopback CDP target printed by its
Desktop supervisor. Keep the native window size. Do not open Next directly as
an authorization test or rebuild/import the App for each iteration.

API keys and the upstream standalone password flow are retired. Notebook content
and audio remain on disk when the App closes. Session invalidation stops old work;
interrupted background commands require an explicit retry. Native packaging and
installed-App acceptance are separate from supervised development.

## Earlier local-package verification

The resumed run installed 1.14.0 and exposed a frozen-backend startup failure.
The repaired 1.14.1 package was then applied through the existing Imported
source's **Update from local file** action. Its installed window now creates
Chinese notebooks, imports PDFs, generates real summaries and embeddings,
answers in Chinese with source citations, and saves files through the native
save dialog. Installed podcast generation, playback, native MP3 saving and
re-import through Nimi transcription also passed. After quitting and reopening
through Desktop, the same notebook still contains its source and saved note.
The 1.14.0 archive is retained only
as the failed checkpoint; use 1.14.1 for this local installation cohort.

The macOS development adaptation has exercised all four AI capabilities through
the protected SDK/Kit carrier. Verification below was performed on 2026-09-27
(Asia/Shanghai), using synthetic research content in the notebook
**Nimi 适配验收 · 海风研究**. The original MIT license is unchanged. The upstream
baseline is `3127f14ea9dbb519f0e4ddc64a0742ca644ba6ef`, version 1.14.0, from
`https://github.com/nimiplatform/open-notebook`.

### Product journeys

| Journey | Observed result |
| --- | --- |
| Protected launch and authorization | Desktop-supervised Electron starts the original research interface and its managed Python/SurrealDB processes. The generated reference App completed authorization, configuration save/reload and a real text call on the SDK 0.19 / Kit 0.16 cohort. That successful-path baseline was reused after the final connector-error mapping package refresh. |
| Text source and transformation | Imported the Chinese fictional research source, generated a real summary and retained it as a source insight. |
| Embeddings and Ask | Indexed the source through Nimi, then completed the three-stage research flow with source citations. The answer retained the rules for six observations and missing data. |
| Notebook chat and notes | Asked about the project lead and sampling plan, saved the cited model answer as a note, and verified the saved content. |
| PDF and source chat | Uploaded a real PDF, checked its extracted text in the App, and obtained a Chinese answer with citations to that PDF. |
| Web source | Imported `https://example.com` and verified the extracted content. URL/document extraction remains App-owned. |
| Single-speaker podcast | Generated three outline segments and nine Chinese dialogue entries through Nimi text, synthesized them through Nimi speech Jobs, and assembled a 264,812-byte MP3. FFmpeg decoded the entire file; the App player loaded it and advanced playback without a media error. Duration: 66.08 seconds. |
| Two-speaker podcast and language | An English PDF and English briefing produced Chinese dialogue using the profile's `zh-CN` setting. Eighteen dialogue entries used the selected Vivian and Eric voices. After explicit retry of the interrupted task, all clips composed into a 230,828-byte MP3; full decoding passed. After another App restart, the player loaded and played it without a media error, duration 57.6 seconds. |
| Speech recognition | Re-imported that generated MP3 through the normal source upload UI. Nimi returned the Chinese transcript, which appeared as a completed research source. It retained the six records and no-zero-fill rule; the recognizer rendered the homophone 海风 as 海丰. The App preserves that actual output. |
| Restart retention | Resumed the same development registration after Host and shared Runtime/Desktop restarts. Notebook, source content, note, profiles, model configuration and completed podcast remained available. No interrupted work was automatically replayed. |
| Interrupted generation | Stopped the supervised App during real dual-speaker synthesis. After resume, the episode was failed with `Notebook session ended; retry explicitly`, its three-segment outline and 18 dialogue entries remained, and it had no completed audio. Generation resumed only after clicking Retry. |
| Installed 1.14.1 | Updated the exact Imported 1.14.0 source, launched its packaged Next server and frozen Python worker, created **安装版验收 · 海风研究**, imported a PDF, generated a real summary and embeddings, and obtained a Chinese answer citing the source and its insight. The answer correctly gave six samples and prohibited zero-filling. |
| Native file save | The installed App's **Download File** action opened the macOS save panel. Saved `.nimi/local/安装版-海风资料.pdf`; its SHA-256 matched the original PDF exactly (`855f9d7f5d3a5359de41515455f58a2963dd09dae51dbfcfb7f14d46c94c6449`). |
| Installed restart | Created **重开保留 · 中文笔记**, quit normally, and relaunched through Desktop. The same Chinese notebook remained with one source and one note. |
| Installed podcast generation | Created speaker and episode profiles through the installed UI, selected Nimi's Vivian voice and `zh-CN`, and generated **安装版 · 海风中文播客** from the installed PDF. The UI exposed Chinese dialogue retaining the sampling and missing-data rules. The packaged worker produced 15 WAV clips and a 173,228-byte MP3 (43.25 seconds); the installed FFmpeg decoded the entire MP3 successfully. The UI showed one completed episode, and playback advanced from 12 to 17 seconds before pausing. |
| Installed audio save and transcription | Used the player's **Download** action and macOS save panel to save `.nimi/local/安装版-海风中文播客.mp3`; its SHA-256 matched the generated audio exactly. Re-imported that file through the native chooser as **安装版 · 播客音频转写** (`source:i4i6moxf4rswv8ypsmv3`). Nimi returned the complete Chinese transcript, including six samples, recording rain interruptions, no zero-filling, and the closing thanks. |

The model choices used for these checks were selected in Kit AIConfig:
local Gemma 4 text generation, local llama.cpp GGUF embeddings, local Qwen3 TTS
CustomVoice synthesis, and the existing Dashscope connector's
`qwen-audio-3.0-asr-flash-streaming` transcription target. These choices are
workspace configuration, not provider/model constants in App code.

### Fixes established during acceptance

- The App accepts the selected speech model's output container and decodes it
  before composing its own MP3 export. Requiring MP3 directly had correctly
  failed on the WAV-only local model.
- Podcast outlines are saved before validating segment count. Explicit retries
  retain additional user instructions. The selected episode language is included
  in both outline and transcript prompts, independently of the source language.
- Runtime embedding-space identifiers survive batching, pooling and persistence.
  Search excludes other spaces even when vectors have the same dimensions;
  a new index replaces old source chunks only after generation succeeds.
- The private worker channel uses strict UTF-8 byte pipes, rejects unsupervised
  use, carries cancellation, and ignores canceled requests' late terminal replies.
- The private HTTP header is added only to requests from an owned renderer at
  the allowed App origin. A temporary embedded-frame request to the live API
  received HTTP 401; the main renderer's same API request returned HTTP 200.
  The temporary frame was removed after this boundary check.
- API startup restores Python's standard verified HTTPS context after loading
  `content-core`, whose YouTube import otherwise disables the default certificate
  checks process-wide. A fresh-process regression failed before this repair and
  passed afterwards, checking both certificate validation and hostname checks.
  HTTPS source import also completed through the restarted App.
- App metadata uses a 512-pixel rendering of the existing SVG logo. The upstream
  raster exceeded Desktop's icon size limit.
- Frozen startup now uses Python 3.11+'s `tomllib` instead of an unnecessary
  compiled `tomli` dependency, and packages imageio's required distribution
  metadata. A stale local `typer` installation left by overlapping `typer-slim`
  files was repaired through the normal locked dependency installer.
- Backend startup failures no longer restart a process on each authorization
  poll or tell an already-authorized user to authorize again. Explicit Retry
  starts another backend attempt; the regression covers both this behavior
  and the requirement for a bound Nimi session.

The shared Nimi change belongs to Runtime: cloud AIConfig options now collapse
catalog aliases of the same executable target while preserving canonical labels
and alias searches. Its owners are
`runtime/internal/services/connector/ai_config_options.go` and the adjacent test.
The connector suite and App AIConfig tests passed. Open Notebook's real Kit
picker then showed five distinct Dashscope ASR targets without duplicate-key
warnings. There is no App-side model-list deduplication or provider bypass.
The same shared Runtime/Desktop restart also loaded another session's native
missing-connector error mapping; affected sessions were notified briefly.

### Checks and build scope

- App Tools `check`, Electron and frontend TypeScript checks: passed.
- Frontend: 137 tests in 26 files passed. Lint passed with five existing hook
  warnings in untouched source components and the original generation dialog.
- Backend: the final full suite passed 567 tests, including language, HTTPS,
  cancellation and embedding-space regressions. Modified Python files pass Ruff;
  the eight Nimi Python modules pass mypy. Two upstream dependency deprecation
  warnings remain.
- Real SurrealDB vector-space/search regression: four tests passed.
- The macOS build at adaptation commit `0abbe3f` and `pack --target macos-aarch64 --production`
  passed on the resumed acceptance run: Next standalone, frozen Python worker,
  SurrealDB resources, Electron packaging and native seal validation. Routine
  functional work still uses development/CDP. The App-owned packager now rejects
  signing failures explicitly, and the npm manifest declares its existing MIT
  license. Installation results are recorded separately below.

Current verified local package:
`dist/nimi-app/io.github.nimiplatform.open-notebook-1.14.1-macos-aarch64.nimiapp`
(1,268,860,529 bytes), SHA-256
`6b831035074c160c5edc16f7c1eebeba440f2a64d7397794e43a1b3f39cd3c64`.
For an existing Imported installation, open its details and choose
**More actions → Update from local file**. That path binds the update to the
existing source and preserves its Nimi-managed data reference.
Before the installed journey above, its frozen worker started against an isolated
temporary database and returned version 1.14.1 with database status online. The
ARM64 FFmpeg binary in the actual installed payload also decoded the complete
previously generated MP3 successfully.
Native posture: `production-unsigned`, current-user launch, ad-hoc seal, no
Developer ID or notarization. The same-cohort reference package also passed
production packing and was imported through Desktop. Its exact Imported 0.1.0
source launched with Nimi Access ready and completed a real text request with
the output `安装授权验收通过。` in its native installed window.

### Audit follow-up

The frontend now reads the Host's current API endpoint for each request and
caches version/health information by backend URL. Four added regressions cover
endpoint changes, late old responses, failed requests and explicit retry.
The existing installed 1.14.1 archive above predates this source fix; a real
installed backend-crash/recovery journey is **NOT-VERIFIED** for the fix.

Frontend CI now installs the root pnpm workspace on Node 24 and runs on both
`main` and `nimi`. The complete dependency archives below are included in Git,
so CI no longer needs a developer's ignored `.nimi/local/packages/` directory.
A separate source snapshot without existing dependencies or local artifacts
passed `pnpm install --frozen-lockfile` and all 137 frontend coverage tests.
Its Next production build also passed, with two CSS optimizer warnings; the
first attempt hit a Google Fonts connection failure, so font downloads still
require network access at build time.
App Tools check and its no-change sync preview also passed for the relocated
archives. The managed release workflow remains owned by App Tools.

The complete native GitHub workflow is still **NOT-VERIFIED**: its build jobs
need explicit Python/uv and SurrealDB preparation, and the matching Windows
native carrier is not in this cohort (the registry query for version 0.16.0
returned 404). These are native build prerequisites beyond the repaired
workspace dependency installation. Public-release preflight still requires
registry resolutions.

### Exact local package combination

Declarations: SDK `^0.19.0`, Kit `^0.16.0`, App Tools `^0.11.4`, exact
nimi-coding `0.6.3`, pnpm `10.34.5`. `pnpm-lock.yaml` pins the actual resolutions.
All overrides are complete `.tgz` packages; no source-workspace links are used.
The native target is `macos-aarch64` / `darwin-arm64`, built with the
`source-local-development` trust profile for the source Desktop carrier
(Electron 42.10.1). Matching version numbers alone are insufficient.

All paths in this table are below `vendor/nimi/`. These are the same bytes used
for the recorded acceptance; moving the archives into Git does not change the
selected package combination:

| Archive | SHA-256 |
| --- | --- |
| `nimiplatform-sdk-0.19.0.tgz` | `4597ca7783f11badf2c765cb1e4119b99f0b9508460214a29ff99e9d0b866a45` |
| `nimiplatform-kit-0.16.0.tgz` | `f44da5fd9150c63a9fbeefbc4e5fad9b1698223eb7f1464e5fa0a13c63070dd0` |
| `nimiplatform-app-tools-0.11.4.tgz` | `969d3bb7e5c512ab05b8e24b5249eb96da848186d58f03b7038d034028aead16` |
| `nimiplatform-kit-protected-local-darwin-arm64-0.16.0.tgz` | `025ecc532c2740cd79ccd5e31d4bf9880987e171c8f46fec64cee9a6c9b7b8b8` |

These packages came from the Nimi working tree based on
`711fa4829ab5c7be54bc3e926177b99b9c3127e4`, including concurrent source changes.
The Runtime binary used for final development checks has SHA-256
`3e7cbc53f8c9908e51f3fb1b397c9cbf098a4281ad981e838967f7438b5442e3`.
The resumed installation run uses Runtime SHA-256
`30c93647df3ee38ee078374ccb2917f6747eaadd655703775f16db6fce8550f2`,
including the parallel session's temporary-package verification I/O repair.
The selected complete archives are tracked in Git; local build and verification
output remains ignored under `.nimi/local/`. Upgrade this cohort deliberately
through the App Tools package workflow. Public release requires registry resolutions and
the production native profile; this development combination is not a release.

### Remaining acceptance and decisions

- Native file save is verified through the installed PDF source workflow.
  Installed podcast generation also produced real audio at
  `workspaces/995f9f8c-f04f-42a1-92ed-d3be6a617046/podcasts/episodes/683357bd-ff4a-49e3-bd83-51f1b973c6d2/podcast.mp3`
  below the App's business-data root. SHA-256:
  `d09aef74c95625a221f0b8593c1f1d7ad03c5aaa2241ed5078fb1fa4f80ff225`.
  Installed player playback, native audio download and re-import/transcription
  subsequently passed after the native window became available. The saved MP3
  has the same hash. This completion used the existing 1.14.1 installation;
  no further build or import was needed.
- **Verified — system-browser handoff:** clicking the original source link
  opened `https://example.com` in Chrome, observed through native UI. Open
  Notebook stayed at its own source-detail URL and kept its protected origin.
- **NOT-VERIFIED:** Windows execution, actual account switching, optional
  Docling/Crawl4AI/YouTube fallback engines, ordinary system-Runtime/Catalog
  installation, and public release. The initial installed 1.14.0 could not create
  business content, so populated cross-version retention was not established;
  the actual update and 1.14.1 restart retention were verified separately.
- No unresolved product or ownership fork is required for the implemented scope.
  Public Integration operations remain excluded by the user's confirmed choice.
